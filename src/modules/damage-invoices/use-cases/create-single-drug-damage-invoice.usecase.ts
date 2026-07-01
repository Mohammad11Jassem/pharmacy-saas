import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
} from '../../../generated/prisma/enums';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { CreateSingleDrugDamageInvoiceDto } from '../dto/create-single-drug-damage-invoice.dto';
import { calculateBatchAvailableQuantity } from '../helpers/calculate-batch-available-quantity.helper';
import { generateDamageInvoiceNumber } from '../helpers/generate-damage-invoice-number.helper';
type BatchForDamage = {
  batchId: number;
  pharmacyDrugId: number;
  initialQuantity: number;
  soldQuantity: number;
  expiryDate: Date | null;
  receivedDate: Date | null;
  pharmacyDrug: {
    consumerPrice: Prisma.Decimal | null;
  };
};

type ResolvedDamageBatch = {
  batchId: number;
  quantityDamaged: number;
  unitConsumerPrice: Prisma.Decimal;
  notes?: string;
};

@Injectable()
export class CreateSingleDrugDamageInvoiceUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(pharmacyId: number, dto: CreateSingleDrugDamageInvoiceDto) {
    return this.unitOfWork.execute(async (tx) => {
      // Ensure the pharmacy drug exists in the pharmacy
      await this.ensurePharmacyDrugExists(tx, pharmacyId, dto.pharmacyDrugId);

      // Resolve the batches to use for this damage invoice, either from the provided batchAllocations or automatically
      const resolvedBatches =
        dto.batchAllocations && dto.batchAllocations.length > 0
          ? await this.resolveSelectedBatches(tx, pharmacyId, dto)
          : await this.resolveAutomaticBatche(tx, pharmacyId, dto);

      // Validate that the total quantityDamaged across all resolved batches equals dto.quantityDamaged , If one batch is used, this is already validated in  resolveAutomaticBatche
      const totalResolvedQuantity = resolvedBatches.reduce(
        (sum, item) => sum + item.quantityDamaged,
        0,
      );

      if (totalResolvedQuantity !== dto.quantityDamaged) {
        throw new BadRequestException(
          'Resolved damaged quantity does not match requested quantity',
        );
      }

      const pharmacyInvoice = await tx.pharmacyInvoice.create({
        data: {
          pharmacyId,

          invoiceType: PharmacyInvoiceType.DAMAGE,

          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),

          notes: dto.notes?.trim(),

          status: PharmacyInvoiceStatus.POSTED,
        },
      });

      const invoiceNumber = generateDamageInvoiceNumber();

      const damageInvoice = await tx.damageInvoice.create({
        data: {
          invoiceNumber,
          damageReason: dto.damageReason.trim(),
          pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
        },
      });
      await tx.damageInvoiceItem.createMany({
        data: resolvedBatches.map((item) => ({
          damageInvoiceId: damageInvoice.damageInvoiceId,

          batchId: item.batchId,

          quantityDamaged: item.quantityDamaged,
          unitConsumerPrice: item.unitConsumerPrice,
          //   damageReason: dto.damageReason,

          notes: item.notes?.trim() ?? dto.itemNotes?.trim(),
        })),
      });

      for (const item of resolvedBatches) {
        await tx.batch.update({
          where: {
            batchId: item.batchId,
          },
          data: {
            soldQuantity: {
              increment: item.quantityDamaged,
            },
          },
        });
      }

      /// update the response here
      const createdInvoice = await tx.damageInvoice.findUnique({
        where: {
          damageInvoiceId: damageInvoice.damageInvoiceId,
        },
        select: {
          damageInvoiceId: true,
          invoiceNumber: true,
          damageReason: true,
          pharmacyInvoice: {
            select: {
              pharmacyInvoiceId: true,
              pharmacyId: true,
              invoiceType: true,
              invoiceDate: true,
              status: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          items: {
            orderBy: {
              damageInvoiceItemId: 'asc',
            },
            select: {
              damageInvoiceItemId: true,
              batchId: true,
              quantityDamaged: true,
              unitConsumerPrice: true,
              notes: true,
              createdAt: true,

              //   batch: {
              //     select: {
              //       batchId: true,
              //       pharmacyDrugId: true,
              //       expiryDate: true,
              //       receivedDate: true,
              //       initialQuantity: true,
              //       soldQuantity: true,
              //       status: true,

              //       pharmacyDrug: {
              //         select: {
              //           pharmacyDrugId: true,
              //           drugId: true,

              //           drug: {
              //             select: {
              //               source: true,

              //               generalDrug: {
              //                 select: {
              //                   generalDrugId: true,
              //                   tradeName: true,
              //                   barcode: true,
              //                 },
              //               },

              //               privateDrug: {
              //                 select: {
              //                   privateDrugId: true,
              //                   tradeName: true,
              //                   barcode: true,
              //                 },
              //               },
              //             },
              //           },
              //         },
              //       },
              //     },
              //   },
            },
          },
        },
      });

      return {
        damageInvoiceId: createdInvoice?.damageInvoiceId,

        pharmacyInvoice: createdInvoice?.pharmacyInvoice,

        pharmacyDrugId: dto.pharmacyDrugId,

        quantityDamaged: dto.quantityDamaged,

        damageReason: dto.damageReason,

        items: createdInvoice?.items ?? [],
      };
    });
  }

  private async ensurePharmacyDrugExists(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    pharmacyDrugId: number,
  ) {
    const pharmacyDrug = await tx.pharmacyDrug.findFirst({
      where: {
        pharmacyDrugId,
        pharmacyId,
      },
      select: {
        pharmacyDrugId: true,
      },
    });

    if (!pharmacyDrug) {
      throw new NotFoundException(`Pharmacy drug not found: ${pharmacyDrugId}`);
    }

    return pharmacyDrug;
  }

  // to get the batches to use for this damage invoice, either from the provided batchAllocations
  private async resolveSelectedBatches(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    dto: CreateSingleDrugDamageInvoiceDto,
  ): Promise<ResolvedDamageBatch[]> {
    const allocations = dto.batchAllocations ?? [];

    // Validate that the sum of quantityDamaged in allocations (the quantity damaged from all batches) equals dto.quantityDamaged
    const allocationTotal = allocations.reduce(
      (sum, allocation) => sum + allocation.quantityDamaged,
      0,
    );

    if (allocationTotal !== dto.quantityDamaged) {
      throw new BadRequestException(
        'Sum of batch allocations must equal quantityDamaged',
      );
    }

    // Validate that there are no duplicate batchIds in allocations
    const batchIds = allocations.map((allocation) => allocation.batchId);

    const uniqueBatchIds = new Set(batchIds);

    if (uniqueBatchIds.size !== batchIds.length) {
      throw new BadRequestException('Duplicate batchId is not allowed');
    }

    const batches = await tx.batch.findMany({
      // Ensure that all batchIds exist and belong to the specified pharmacyDrugId and pharmacyId
      where: {
        batchId: {
          in: batchIds,
        },

        pharmacyDrugId: dto.pharmacyDrugId,

        pharmacyDrug: {
          pharmacyId,
        },
      },
      select: {
        batchId: true,
        pharmacyDrugId: true,
        initialQuantity: true,
        soldQuantity: true,
        expiryDate: true,
        receivedDate: true,
        pharmacyDrug: {
          select: {
            consumerPrice: true,
          },
        },
      },
    });

    if (batches.length !== batchIds.length) {
      throw new NotFoundException(
        'One or more batches were not found for this pharmacy drug',
      );
    }

    // Validate that each allocation's quantityDamaged does not exceed the available quantity for that batch

    // put ids in a map for easy access
    const batchById = new Map<number, BatchForDamage>(
      batches.map((batch) => [batch.batchId, batch]),
    );

    const resolved: ResolvedDamageBatch[] = [];

    for (const allocation of allocations) {
      const batch = batchById.get(allocation.batchId);

      if (!batch) {
        throw new NotFoundException(`Batch not found: ${allocation.batchId}`);
      }

      const availableQuantity = calculateBatchAvailableQuantity(batch);

      if (allocation.quantityDamaged > availableQuantity) {
        throw new BadRequestException(
          `Damaged quantity exceeds available quantity for batch ${allocation.batchId}`,
        );
      }
      const unitConsumerPrice = batch.pharmacyDrug.consumerPrice;

      resolved.push({
        batchId: allocation.batchId,

        quantityDamaged: allocation.quantityDamaged,

        notes: allocation.notes,
        unitConsumerPrice,
      });
    }

    return resolved;
  }

  // to get the batches to use for this damage invoice, automatically selecting the nearest batch by expiry date
  private async resolveAutomaticBatche(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    dto: CreateSingleDrugDamageInvoiceDto,
  ): Promise<ResolvedDamageBatch[]> {
    const nearestBatch = await tx.batch.findFirst({
      where: {
        pharmacyDrugId: dto.pharmacyDrugId,

        pharmacyDrug: {
          pharmacyId,
        },
      },

      orderBy: [
        {
          expiryDate: 'asc',
        },
        {
          receivedDate: 'asc',
        },
        {
          batchId: 'asc',
        },
      ],

      select: {
        batchId: true,
        pharmacyDrugId: true,
        initialQuantity: true,
        soldQuantity: true,
        expiryDate: true,
        receivedDate: true,
        pharmacyDrug: {
          select: {
            consumerPrice: true,
          },
        },
      },
    });

    if (!nearestBatch) {
      throw new BadRequestException('No batch found for this pharmacy drug');
    }

    const availableQuantity = calculateBatchAvailableQuantity(nearestBatch);

    if (availableQuantity <= 0) {
      throw new BadRequestException(
        `Nearest batch ${nearestBatch.batchId} has no available quantity`,
      );
    }

    if (dto.quantityDamaged > availableQuantity) {
      throw new BadRequestException(
        `Damaged quantity exceeds available quantity for nearest batch ${nearestBatch.batchId}`,
      );
    }
    const unitConsumerPrice = nearestBatch.pharmacyDrug.consumerPrice;
    return [
      {
        batchId: nearestBatch.batchId,
        quantityDamaged: dto.quantityDamaged,
        unitConsumerPrice,
        notes: dto.itemNotes,
      },
    ];
  }
}
