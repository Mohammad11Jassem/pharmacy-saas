import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreatePurchaseOrderItemDto } from '../purchase-order-item/dto/create-purchase-order-item.dto';
import {
  OrderStatus,
  Prisma,
  PurchaseOrderItemStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrderFilterDto } from './dto/create-purchase-order-filter.dto';
import {
  mapPurchaseOrderListResponse,
  mapPurchaseOrderResponse,
  purchaseOrderItemsWithTradeNameInclude,
  purchaseOrderListInclude,
} from './mappers/purchase-order-response.mapper';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../common/pagination/pagination.util';
import { PurchaseOrderExcelService } from './excel/purchase-order-excel.service';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private excelService: PurchaseOrderExcelService,
  ) {}

  async create(pharmacyId: number, dto: CreatePurchaseOrderDto) {
    const idempotencyKey = dto.idempotencyKey.trim();

    const existingOrder = await this.prisma.purchaseOrder.findFirst({
      where: {
        pharmacyId,
        idempotencyKey,
      },

      include: {
        items: true,
      },
    });

    if (existingOrder) {
      return existingOrder;
    }
    /**
     * يجب أن يحتوي طلب المورد على دواء واحد على الأقل.
     */
    if (!dto.items?.length) {
      throw new BadRequestException(
        'Purchase order must contain at least one item',
      );
    }

    /**
     * expectedReceiptDate اختياري عند إنشاء الطلب.
     *
     * إذا قام الصيدلي بإرساله:
     * - نحوله إلى Date
     * - نتحقق أنه ليس في الماضي
     *
     * مثال للقيمة القادمة من DTO:
     * "2026-08-25"
     */
    let expectedReceiptDate: Date | null = null;

    if (dto.expectedReceiptDate) {
      expectedReceiptDate = new Date(dto.expectedReceiptDate);

      /**
       * بداية اليوم الحالي.
       *
       * نستخدم UTC لأن Date القادمة من:
       * YYYY-MM-DD
       * يتم تفسيرها كتاريخ UTC.
       */
      const today = new Date();

      today.setUTCHours(0, 0, 0, 0);

      if (expectedReceiptDate < today) {
        throw new BadRequestException(
          'Expected receipt date cannot be in the past',
        );
      }
    }

    try {
      return this.prisma.$transaction(async (tx) => {
        /**
         * نتأكد بالتوازي من:
         *
         * 1. المورد يتبع للصيدلية.
         * 2. جميع الأدوية تتبع للصيدلية.
         */
        await Promise.all([
          this.assertSupplierBelongsToPharmacy(dto.supplierId, pharmacyId, tx),

          this.assertDrugsBelongToPharmacy(dto.items, pharmacyId, tx),
        ]);

        /**
         * إنشاء Purchase Order.
         *
         * orderStatus غير مرسل هنا،
         * لذلك Prisma سيضع القيمة الافتراضية:
         *
         * PENDING
         *
         * أي أن الطلب يبدأ كمسودة.
         */
        return tx.purchaseOrder.create({
          data: {
            pharmacyId,

            supplierId: dto.supplierId,

            idempotencyKey,

            notes: dto.notes,

            /**
             * يمكن أن تكون:
             *
             * Date
             * أو
             * null
             *
             * لأن الحقل اختياري في الـ schema.
             */
            expectedReceiptDate,

            items: {
              create: dto.items.map((item) => ({
                pharmacyDrugId: item.pharmacyDrugId,

                orderedQuantityBoxes: item.orderedQuantityBoxes,

                notes: item.notes,
              })),
            },
          },

          include: {
            items: true,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingOrder = await this.prisma.purchaseOrder.findFirst({
          where: {
            pharmacyId,
            idempotencyKey,
          },

          include: {
            items: true,
          },
        });

        if (existingOrder) {
          return existingOrder;
        }
      }

      throw error;
    }
  }

  private async assertSupplierBelongsToPharmacy(
    supplierId: number,
    pharmacyId: number,
    tx: Prisma.TransactionClient,
  ) {
    const supplier = await tx.supplier.findFirst({
      where: { supplierId, pharmacyId },
      select: { supplierId: true },
    });

    if (!supplier) {
      throw new BadRequestException('Invalid supplierId for this pharmacy');
    }
  }

  private async assertDrugsBelongToPharmacy(
    items: CreatePurchaseOrderItemDto[],
    pharmacyId: number,
    tx: Prisma.TransactionClient,
  ) {
    const uniqueDrugIds = [
      ...new Set(items.map((item) => item.pharmacyDrugId)),
    ];

    const pharmacyDrugs = await tx.pharmacyDrug.findMany({
      where: {
        pharmacyDrugId: { in: uniqueDrugIds },
        pharmacyId,
      },
      select: { pharmacyDrugId: true },
    });

    if (pharmacyDrugs.length !== uniqueDrugIds.length) {
      throw new BadRequestException(
        'One or more pharmacyDrugId values are invalid for this pharmacy',
      );
    }
  }

  async findAll(pharmacyId: number, filters: PurchaseOrderFilterDto) {
    const { supplierId, pharmacyDrugId } = filters;

    const { page, limit, skip, take } = getPaginationParams(
      filters.page,
      filters.limit,
    );

    const where: Prisma.PurchaseOrderWhereInput = {
      pharmacyId,

      ...(supplierId !== undefined
        ? {
            supplierId,
          }
        : {}),

      ...(pharmacyDrugId !== undefined
        ? {
            items: {
              some: {
                pharmacyDrugId,
              },
            },
          }
        : {}),
    };

    const [purchaseOrders, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,

        include: purchaseOrderListInclude,

        orderBy: {
          createdAt: 'desc',
        },

        skip,
        take,
      }),

      this.prisma.purchaseOrder.count({
        where,
      }),
    ]);

    return toPaginatedResult(
      purchaseOrders.map(mapPurchaseOrderListResponse),
      total,
      page,
      limit,
    );
  }

  async findOne(pharmacyId: number, id: number) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: {
        purchaseOrderId: id,
        pharmacyId,
      },

      include: {
        supplier: true,

        ...purchaseOrderItemsWithTradeNameInclude,
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return mapPurchaseOrderResponse(purchaseOrder);
  }

  async updateStatus(
    pharmacyId: number,
    purchaseOrderId: number,
    status: OrderStatus,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: {
        purchaseOrderId,

        pharmacyId,
      },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    this.validateOrderStatusTransition(order.orderStatus, status);

    if (status === OrderStatus.RECEIVED) {
      const canReceive = await this.canMarkOrderAsReceived(purchaseOrderId);

      if (!canReceive) {
        throw new BadRequestException(
          'Cannot mark order as received before receiving all items',
        );
      }
    }

    return this.prisma.purchaseOrder.update({
      where: {
        purchaseOrderId,
      },

      data: {
        orderStatus: status,
      },
    });
  }

  async updateItemStatus(
    pharmacyId: number,
    purchaseOrderId: number,
    itemId: number,
    status: PurchaseOrderItemStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findFirst({
        where: {
          purchaseOrderItemId: itemId,

          purchaseOrderId,

          purchaseOrder: {
            pharmacyId,
          },
        },
      });

      if (!item) {
        throw new NotFoundException('Purchase order item not found');
      }

      this.validateItemStatusTransition(item.status, status);
      const updatedItem = await tx.purchaseOrderItem.update({
        where: {
          purchaseOrderItemId: itemId,
        },

        data: {
          status,
        },
      });

      await this.syncPurchaseOrderStatus(purchaseOrderId, tx);

      return updatedItem;
    });
  }

  private async syncPurchaseOrderStatus(
    purchaseOrderId: number,
    tx: Prisma.TransactionClient,
  ) {
    const items = await tx.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId,
      },

      select: {
        status: true,
      },
    });

    const allReceived =
      items.length > 0 &&
      items.every((item) => item.status === PurchaseOrderItemStatus.RECEIVED);

    const allCancelled =
      items.length > 0 &&
      items.every((item) => item.status === PurchaseOrderItemStatus.CANCELLED);

    if (allReceived) {
      await tx.purchaseOrder.update({
        where: {
          purchaseOrderId,
        },

        data: {
          orderStatus: OrderStatus.RECEIVED,
        },
      });
    }

    if (allCancelled) {
      await tx.purchaseOrder.update({
        where: {
          purchaseOrderId,
        },

        data: {
          orderStatus: OrderStatus.CANCELLED,
        },
      });
    }
  }

  private async canMarkOrderAsReceived(purchaseOrderId: number) {
    const pendingItems = await this.prisma.purchaseOrderItem.count({
      where: {
        purchaseOrderId,

        status: {
          not: PurchaseOrderItemStatus.RECEIVED,
        },
      },
    });

    return pendingItems === 0;
  }

  private validateOrderStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
  ) {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],

      CONFIRMED: [OrderStatus.RECEIVED, OrderStatus.CANCELLED],

      RECEIVED: [],

      CANCELLED: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot change status from ${current} to ${next}`,
      );
    }
  }

  private validateItemStatusTransition(
    current: PurchaseOrderItemStatus,
    next: PurchaseOrderItemStatus,
  ) {
    const allowed: Record<PurchaseOrderItemStatus, PurchaseOrderItemStatus[]> =
      {
        PENDING: [
          PurchaseOrderItemStatus.RECEIVED,
          PurchaseOrderItemStatus.CANCELLED,
        ],

        RECEIVED: [],

        CANCELLED: [],
      };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot change item status from ${current} to ${next}`,
      );
    }
  }

  async exportExcel(
    pharmacyId: number,

    purchaseOrderId: number,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: {
        purchaseOrderId,

        pharmacyId,
      },

      include: {
        pharmacy: true,

        supplier: true,

        items: {
          include: {
            pharmacyDrug: {
              include: {
                drug: {
                  include: {
                    generalDrug: true,

                    privateDrug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }
    /*
     * 2. إنشاء ملف Excel أولاً
     *
     * مهم:
     * لا نغيّر حالة الطلبية قبل هذا السطر،
     * لأنه إذا فشل إنشاء الملف لا نريد اعتبار الطلبية CONFIRMED.
     */
    const file = await this.excelService.generate(order);

    /*
     * 3. بعد نجاح إنشاء الملف نغيّر حالة الطلبية إلى CONFIRMED
     */
    await this.prisma.purchaseOrder.update({
      where: {
        purchaseOrderId,
      },

      data: {
        orderStatus: OrderStatus.CONFIRMED,
      },
    });

    /*
     * 4. إعادة ملف Excel إلى Controller
     */
    return file;
    // return this.excelService.generate(order);
  }
}
