import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreatePurchaseOrderItemDto } from '../purchase-order-item/dto/create-purchase-order-item.dto';
import { OrderStatus, Prisma } from '../../generated/prisma/client';
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

  // async findAll(pharmacyId: number, filters: PurchaseOrderFilterDto) {
  //   const { supplierId, pharmacyDrugId } = filters;

  //   return this.prisma.purchaseOrder.findMany({
  //     where: {
  //       pharmacyId,
  //       ...(supplierId !== undefined ? { supplierId } : {}),
  //       ...(pharmacyDrugId !== undefined
  //         ? {
  //             items: {
  //               some: {
  //                 pharmacyDrugId,
  //               },
  //             },
  //           }
  //         : {}),
  //     },
  //     include: {
  //       supplier: true,
  //       items: {
  //         include: {
  //           pharmacyDrug: true,
  //         },
  //       },
  //     },
  //     orderBy: {
  //       createdAt: 'desc',
  //     },
  //   });
  // }

  // async findAll(pharmacyId: number, filters: PurchaseOrderFilterDto) {
  //   const { supplierId, pharmacyDrugId } = filters;

  //   const purchaseOrders = await this.prisma.purchaseOrder.findMany({
  //     where: {
  //       pharmacyId,

  //       ...(supplierId !== undefined
  //         ? {
  //             supplierId,
  //           }
  //         : {}),

  //       ...(pharmacyDrugId !== undefined
  //         ? {
  //             items: {
  //               some: {
  //                 pharmacyDrugId,
  //               },
  //             },
  //           }
  //         : {}),
  //     },

  //     // لا نجلب items، وإنما supplier وعدد items فقط.
  //     include: purchaseOrderListInclude,

  //     orderBy: {
  //       createdAt: 'desc',
  //     },
  //   });

  //   return purchaseOrders.map(mapPurchaseOrderListResponse);
  // }

  // async findOne(pharmacyId: number, id: number) {
  //   const po = await this.prisma.purchaseOrder.findFirst({
  //     where: {
  //       purchaseOrderId: id,
  //       pharmacyId,
  //     },
  //     include: {
  //       supplier: true,
  //       items: {
  //         include: {
  //           pharmacyDrug: {
  //             include: {
  //               drug: true, // اختياري: تفاصيل الـ drug إذا احتجت
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!po) throw new NotFoundException('Purchase order not found');
  //   return po;
  // }

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
