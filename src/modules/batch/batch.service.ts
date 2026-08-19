import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupplierInvoiceStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddBatchesToSupplierInvoiceDto } from './dto/add-batches-to-supplier-invoice.dto';
import { AddOpeningStockBatchesDto } from './dto/add-opening-stock-batches.dto';
import { CreateSupplierInvoiceItemBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { GetPharmacyDrugBatchesQueryDto } from './dto/get-pharmacy-drug-batches-query.dto';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../common/pagination/pagination.util';

type SupplierInvoiceForStocking = Prisma.SupplierInvoiceGetPayload<{
  include: {
    items: {
      include: {
        batches: true;
        pharmacyDrug: {
          include: {
            drug: {
              include: {
                generalDrug: true;
                privateDrug: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type SupplierInvoiceWithDetails = Prisma.SupplierInvoiceGetPayload<{
  include: {
    supplier: true;
    items: {
      include: {
        pharmacyDrug: true;
        batches: true;
      };
    };
  };
}>;

type SupplierInvoiceItemForStocking =
  SupplierInvoiceForStocking['items'][number];

type InvoiceItemsById = Map<number, SupplierInvoiceItemForStocking>;

type LockedSupplierInvoiceRow = {
  supplierInvoiceId: number;
};

type OpeningStockBatch = Prisma.BatchGetPayload<{
  include: {
    pharmacyDrug: true;
  };
}>;

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  create(createBatchDto: CreateSupplierInvoiceItemBatchDto) {
    return 'This action adds a new batch';
  }

  findAll() {
    return `This action returns all batch`;
  }

  findOne(id: number) {
    return `This action returns a #${id} batch`;
  }

  update(id: number, updateBatchDto: UpdateBatchDto) {
    return `This action updates a #${id} batch`;
  }

  remove(id: number) {
    return `This action removes a #${id} batch`;
  }

  async addBatchesToInvoice(
    pharmacyId: number,
    supplierInvoiceId: number,
    dto: AddBatchesToSupplierInvoiceDto,
  ): Promise<SupplierInvoiceWithDetails> {
    this.validateBatchesPayload(dto.batches);

    return this.prisma.$transaction(async (tx) => {
      /**
       * Lock the supplier invoice first.
       *
       * Any concurrent stocking request for the same invoice
       * must wait until this transaction finishes.
       */
      await this.lockSupplierInvoiceForStocking(
        tx,
        pharmacyId,
        supplierInvoiceId,
      );
      /**
       * Important:
       * Read the invoice AFTER acquiring the lock,
       * so batches and remaining quantities are fresh.
       */
      const invoice = await this.findSupplierInvoiceForStockingOrThrow(
        tx,
        pharmacyId,
        supplierInvoiceId,
      );

      const invoiceItemsById = this.buildInvoiceItemsMap(invoice.items);

      this.validateRequestedBatchQuantities(dto, invoiceItemsById);

      await this.createInvoiceBatches(tx, dto, invoice, invoiceItemsById);

      const updatedInvoice = await this.findSupplierInvoiceForStockingOrThrow(
        tx,
        pharmacyId,
        supplierInvoiceId,
      );

      const stockingStatus =
        this.calculateInvoiceStockingStatus(updatedInvoice);

      return tx.supplierInvoice.update({
        where: {
          supplierInvoiceId,
        },
        data: {
          status: stockingStatus,
        },
        include: {
          supplier: true,
          items: {
            include: {
              pharmacyDrug: true,
              batches: true,
            },
          },
        },
      });
    });
  }

  async findByPharmacyDrug(
    pharmacyId: number,
    pharmacyDrugId: number,
    query: GetPharmacyDrugBatchesQueryDto,
  ) {
    const { fromDate, toDate, supplierId } = query;

    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    if (
      fromDate &&
      toDate &&
      new Date(`${fromDate}T00:00:00.000Z`) >
        new Date(`${toDate}T00:00:00.000Z`)
    ) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }

    const where: Prisma.BatchWhereInput = {
      pharmacyDrugId,

      pharmacyDrug: {
        pharmacyId,
      },

      ...(fromDate || toDate
        ? {
            expiryDate: {
              ...(fromDate
                ? {
                    gte: new Date(`${fromDate}T00:00:00.000Z`),
                  }
                : {}),

              ...(toDate
                ? {
                    lte: new Date(`${toDate}T00:00:00.000Z`),
                  }
                : {}),
            },
          }
        : {}),

      ...(supplierId
        ? {
            supplierInvoiceItem: {
              is: {
                supplierInvoice: {
                  supplierId,

                  supplier: {
                    pharmacyId,
                  },
                },
              },
            },
          }
        : {}),
    };

    const [batches, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({
        where,
        skip,
        take,

        include: {
          pharmacyDrug: {
            include: {
              drug: {
                include: {
                  generalDrug: {
                    select: {
                      unitsPerBox: true,
                    },
                  },

                  privateDrug: {
                    select: {
                      unitsPerBox: true,
                    },
                  },
                },
              },
            },
          },

          supplierInvoiceItem: {
            include: {
              supplierInvoice: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.batch.count({
        where,
      }),
    ]);

    const mappedBatches = batches.map((batch) => {
      const drugInfo =
        batch.pharmacyDrug.drug.generalDrug ??
        batch.pharmacyDrug.drug.privateDrug;

      const unitsPerBox =
        drugInfo?.unitsPerBox && Number(drugInfo.unitsPerBox) > 0
          ? Number(drugInfo.unitsPerBox)
          : 1;

      const initialBaseQuantity = Number(batch.initialQuantity);

      const soldBaseQuantity = Number(batch.soldQuantity);

      const initialQuantity = Math.floor(initialBaseQuantity / unitsPerBox);

      const initialIndividualUnits = initialBaseQuantity % unitsPerBox;

      const soldQuantity = Math.floor(soldBaseQuantity / unitsPerBox);

      const soldIndividualUnits = soldBaseQuantity % unitsPerBox;

      return {
        ...batch,

        // unitsPerBox,

        // Number of complete boxes
        initialQuantity,
        soldQuantity,

        // Remaining individual units
        initialIndividualUnits,
        soldIndividualUnits,
      };
    });

    return toPaginatedResult(mappedBatches, total, page, limit);
  }

  async addOpeningStockBatches(
    pharmacyId: number,
    dto: AddOpeningStockBatchesDto,
  ): Promise<OpeningStockBatch[]> {
    this.validateBatchesPayload(dto.batches);
    this.validateOpeningStockQuantities(dto);

    return this.prisma.$transaction(async (tx) => {
      await this.ensureAllPharmacyDrugsBelongToPharmacy(tx, pharmacyId, dto);

      const createdBatches: OpeningStockBatch[] = [];

      for (const batchDto of dto.batches) {
        const receivedDate = batchDto.receivedDate
          ? new Date(batchDto.receivedDate)
          : new Date();

        this.validateBatchExpiryDate(batchDto.expiryDate, receivedDate);
        const createdBatch = await tx.batch.create({
          data: {
            pharmacyDrugId: batchDto.pharmacyDrugId,
            supplierInvoiceItemId: null,
            batchNumber: batchDto.batchNumber?.trim() || null,
            initialQuantity: batchDto.initialQuantity,
            soldQuantity: 0,
            expiryDate: batchDto.expiryDate
              ? new Date(batchDto.expiryDate)
              : undefined,
            receivedDate,
          },
          include: {
            pharmacyDrug: true,
          },
        });

        createdBatches.push(createdBatch);
      }

      return createdBatches;
    });
  }

  private validateBatchesPayload(batches: unknown): void {
    if (!Array.isArray(batches) || batches.length === 0) {
      throw new BadRequestException('batches must be a non-empty array');
    }
  }

  private async lockSupplierInvoiceForStocking(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    supplierInvoiceId: number,
  ): Promise<void> {
    const lockedRows = await tx.$queryRaw<LockedSupplierInvoiceRow[]>(
      Prisma.sql`
      SELECT
        si."supplier_invoice_id" AS "supplierInvoiceId"
      FROM "supplier_invoices" si
      INNER JOIN "suppliers" s
        ON s."supplier_id" = si."supplier_id"
      WHERE
        si."supplier_invoice_id" = ${supplierInvoiceId}
        AND s."pharmacy_id" = ${pharmacyId}
      FOR UPDATE OF si
    `,
    );

    if (lockedRows.length !== 1) {
      throw new NotFoundException(
        'Supplier invoice not found for this pharmacy',
      );
    }
  }

  private async findSupplierInvoiceForStockingOrThrow(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    supplierInvoiceId: number,
  ): Promise<SupplierInvoiceForStocking> {
    const invoice = await tx.supplierInvoice.findUnique({
      where: {
        supplierInvoiceId,
        supplier: {
          pharmacyId,
        },
      },
      include: {
        items: {
          include: {
            batches: true,

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

    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled invoice cannot be stocked');
    }

    if (invoice.status === 'STOCKED') {
      throw new BadRequestException('Invoice is already fully stocked');
    }

    return invoice;
  }

  private async findSupplierInvoiceWithDetailsOrThrow(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    supplierInvoiceId: number,
  ): Promise<SupplierInvoiceWithDetails> {
    const invoice = await tx.supplierInvoice.findFirst({
      where: {
        supplierInvoiceId,
        supplier: {
          pharmacyId,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            pharmacyDrug: true,
            batches: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    return invoice;
  }

  private buildInvoiceItemsMap(
    items: SupplierInvoiceItemForStocking[],
  ): InvoiceItemsById {
    return new Map(items.map((item) => [item.supplierInvoiceItemId, item]));
  }

  private validateRequestedBatchQuantities(
    dto: AddBatchesToSupplierInvoiceDto,
    invoiceItemsById: InvoiceItemsById,
  ): void {
    const requestedBaseQuantityByItem = new Map<number, number>();

    for (const batchDto of dto.batches) {
      if (batchDto.initialQuantity <= 0) {
        throw new BadRequestException(
          `initialQuantity must be greater than 0 for item ${batchDto.supplierInvoiceItemId}`,
        );
      }

      const invoiceItem = invoiceItemsById.get(batchDto.supplierInvoiceItemId);

      if (!invoiceItem) {
        throw new BadRequestException(
          `Invalid supplierInvoiceItemId: ${batchDto.supplierInvoiceItemId}`,
        );
      }

      const drug = invoiceItem.pharmacyDrug.drug;

      const unitsPerBox = Number(
        drug.source === 'GENERAL'
          ? drug.generalDrug?.unitsPerBox
          : drug.privateDrug?.unitsPerBox,
      );

      if (
        !Number.isFinite(unitsPerBox) ||
        !Number.isInteger(unitsPerBox) ||
        unitsPerBox <= 0
      ) {
        throw new BadRequestException(
          `Invalid unitsPerBox for pharmacyDrugId ${invoiceItem.pharmacyDrugId}`,
        );
      }

      // كمية الـ Batch القادمة من الـ API هي عدد علب.
      // نحولها إلى أصغر وحدة قبل المقارنة مع كمية الفاتورة.
      const requestedBaseQuantity = batchDto.initialQuantity * unitsPerBox;

      requestedBaseQuantityByItem.set(
        batchDto.supplierInvoiceItemId,
        (requestedBaseQuantityByItem.get(batchDto.supplierInvoiceItemId) ?? 0) +
          requestedBaseQuantity,
      );
    }

    for (const [
      supplierInvoiceItemId,
      requestedBaseQuantity,
    ] of requestedBaseQuantityByItem) {
      const invoiceItem = invoiceItemsById.get(supplierInvoiceItemId);

      if (!invoiceItem) {
        throw new BadRequestException(
          `Invalid supplierInvoiceItemId: ${supplierInvoiceItemId}`,
        );
      }

      // هذه أصلًا مخزنة بالـ base units.
      const alreadyBatchedBaseQuantity = invoiceItem.batches.reduce(
        (sum, batch) => sum + batch.initialQuantity,
        0,
      );

      const remainingBaseQuantity =
        invoiceItem.quantity - alreadyBatchedBaseQuantity;

      if (requestedBaseQuantity > remainingBaseQuantity) {
        throw new BadRequestException(
          `Batch quantity exceeds remaining invoice quantity for item ${supplierInvoiceItemId}`,
        );
      }
    }
  }

  private async createInvoiceBatches(
    tx: Prisma.TransactionClient,
    dto: AddBatchesToSupplierInvoiceDto,
    invoice: SupplierInvoiceForStocking,
    invoiceItemsById: InvoiceItemsById,
  ): Promise<void> {
    for (const batchDto of dto.batches) {
      const invoiceItem = invoiceItemsById.get(batchDto.supplierInvoiceItemId);

      if (!invoiceItem) {
        throw new BadRequestException(
          `Invalid supplierInvoiceItemId: ${batchDto.supplierInvoiceItemId}`,
        );
      }

      const drug = invoiceItem.pharmacyDrug.drug;

      const unitsPerBox = Number(
        drug.source === 'GENERAL'
          ? drug.generalDrug?.unitsPerBox
          : drug.privateDrug?.unitsPerBox,
      );

      if (
        !Number.isFinite(unitsPerBox) ||
        !Number.isInteger(unitsPerBox) ||
        unitsPerBox <= 0
      ) {
        throw new BadRequestException(
          `Invalid unitsPerBox for pharmacyDrugId ${invoiceItem.pharmacyDrugId}`,
        );
      }

      // API quantity = boxes
      // DB quantity = base units
      const batchBaseQuantity = batchDto.initialQuantity * unitsPerBox;

      const receivedDate = new Date();

      this.validateBatchExpiryDate(batchDto.expiryDate, receivedDate);

      await tx.batch.create({
        data: {
          pharmacyDrugId: invoiceItem.pharmacyDrugId,

          supplierInvoiceItemId: invoiceItem.supplierInvoiceItemId,

          batchNumber: batchDto.batchNumber?.trim() || null,

          initialQuantity: batchBaseQuantity,

          soldQuantity: 0,

          expiryDate: batchDto.expiryDate
            ? new Date(batchDto.expiryDate)
            : undefined,

          receivedDate,
        },
      });
    }
  }

  private validateOpeningStockQuantities(dto: AddOpeningStockBatchesDto): void {
    for (const batchDto of dto.batches) {
      if (batchDto.initialQuantity <= 0) {
        throw new BadRequestException(
          `initialQuantity must be greater than 0 for pharmacyDrugId ${batchDto.pharmacyDrugId}`,
        );
      }
    }
  }

  private async ensureAllPharmacyDrugsBelongToPharmacy(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    dto: AddOpeningStockBatchesDto,
  ): Promise<void> {
    const pharmacyDrugIds = [
      ...new Set(dto.batches.map((batch) => batch.pharmacyDrugId)),
    ];

    const pharmacyDrugs = await tx.pharmacyDrug.findMany({
      where: {
        pharmacyId,
        pharmacyDrugId: {
          in: pharmacyDrugIds,
        },
      },
      select: {
        pharmacyDrugId: true,
      },
    });

    if (pharmacyDrugs.length !== pharmacyDrugIds.length) {
      throw new BadRequestException(
        'One or more pharmacyDrugId values are invalid for this pharmacy',
      );
    }
  }

  private calculateInvoiceStockingStatus(
    invoice: SupplierInvoiceForStocking,
  ): SupplierInvoiceStatus {
    const isFullyStocked = invoice.items.every((item) => {
      const totalBatched = item.batches.reduce(
        (sum, batch) => sum + batch.initialQuantity,
        0,
      );

      return totalBatched === item.quantity;
    });

    if (isFullyStocked) {
      return SupplierInvoiceStatus.STOCKED;
    }

    const isPartiallyStocked = invoice.items.some((item) => {
      const totalBatched = item.batches.reduce(
        (sum, batch) => sum + batch.initialQuantity,
        0,
      );

      return totalBatched > 0;
    });

    if (isPartiallyStocked) {
      return SupplierInvoiceStatus.PARTIALLY_STOCKED;
    }

    return SupplierInvoiceStatus.PENDING;
  }
  private validateBatchExpiryDate(
    expiryDate?: string,
    receivedDate: Date = new Date(),
  ): void {
    if (!expiryDate) {
      return;
    }

    const expiry = new Date(expiryDate);

    if (Number.isNaN(expiry.getTime())) {
      throw new BadRequestException('Invalid expiryDate');
    }

    const expiryOnly = new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate(),
    );

    const receivedOnly = new Date(
      receivedDate.getFullYear(),
      receivedDate.getMonth(),
      receivedDate.getDate(),
    );

    if (expiryOnly < receivedOnly) {
      throw new BadRequestException('expiryDate cannot be before receivedDate');
    }
  }
}
