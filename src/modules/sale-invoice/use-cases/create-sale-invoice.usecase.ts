import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { CreateSaleInvoiceDto } from '../dto/create-sale-invoice.dto';
import {
  BatchStatus,
  PaymentStatus,
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
  SaleType,
} from '../../../generated/prisma/client';

type ComputedSaleItem = {
  pharmacyDrugId: number;
  unitType: string;
  displayQuantity: number;
  unitFactorToBase: number;
  baseQuantity: number;
  baseUnitPrice: number;
  extraPercentage: number;
  finalUnitPrice: number;
  totalPrice: number;
};

type BatchAllocation = {
  batchId: number;
  baseQuantity: number;
  //   availableBefore: number;
};

type LockedBatchRow = {
  batchId: number;
  pharmacyDrugId: number;
  initialQuantity: number;
  soldQuantity: number;
  expiryDate: Date | null;
  createdAt: Date;
};

// type ComputedSaleItem = {
//   pharmacyDrugId: number;
//   unitType: string;
//   displayQuantity: number;
//   unitFactorToBase: number;
//   baseQuantity: number;
//   baseUnitPrice: number;
//   extraPercentage: number;
//   finalUnitPrice: number;
//   totalPrice: number;
// };

// type BatchAllocation = {
//   batchId: number;
//   baseQuantity: number;
// };

@Injectable()
export class CreateSaleInvoiceUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  //   async execute(pharmacyId: number, dto: CreateSaleInvoiceDto) {
  //     this.validatePayload(dto);

  //     return this.unitOfWork.executeSerializable(async (tx) => {
  //       if (dto.patientId) {
  //         await this.assertPatientBelongsToPharmacy(
  //           tx,
  //           pharmacyId,
  //           dto.patientId,
  //         );
  //       }

  //       const computedItems = this.computeItems(dto);

  //       await this.assertPharmacyDrugsBelongToPharmacy(
  //         tx,
  //         pharmacyId,
  //         computedItems.map((item) => item.pharmacyDrugId),
  //       );

  //       const allocationsByItemIndex = await this.allocateBatchesForItems(
  //         tx,
  //         pharmacyId,
  //         computedItems,
  //       );

  //       const subtotal = this.roundMoney(
  //         computedItems.reduce((sum, item) => sum + item.totalPrice, 0),
  //       );

  //       const discount = this.roundMoney(dto.discount ?? 0);

  //       if (discount > subtotal) {
  //         throw new BadRequestException(
  //           'discount must not be greater than subtotal',
  //         );
  //       }

  //       const totalAmount = this.roundMoney(subtotal - discount);

  //       const pharmacyInvoice = await tx.pharmacyInvoice.create({
  //         data: {
  //           pharmacyId,
  //           patientId: dto.patientId ?? undefined,
  //           invoiceType: PharmacyInvoiceType.SALE,
  //           invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
  //           status: PharmacyInvoiceStatus.POSTED,
  //           notes: dto.notes?.trim() || undefined,
  //         },
  //       });

  //       const saleInvoice = await tx.saleInvoice.create({
  //         data: {
  //           pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
  //           paymentStatus: dto.paymentStatus ?? PaymentStatus.PENDING,
  //           saleType: dto.saleType ?? SaleType.NORMAL,
  //           subtotal,
  //           discount,
  //           totalAmount,
  //         },
  //       });

  //       for (let index = 0; index < computedItems.length; index++) {
  //         const item = computedItems[index];
  //         const allocations = allocationsByItemIndex[index];

  //         const saleInvoiceItem = await tx.saleInvoiceItem.create({
  //           data: {
  //             saleInvoiceId: saleInvoice.saleInvoiceId,
  //             pharmacyDrugId: item.pharmacyDrugId,

  //             unitType: item.unitType as any,
  //             baseQuantity: item.baseQuantity,
  //             unitFactorToBase: item.unitFactorToBase,

  //             baseUnitPrice: item.baseUnitPrice,
  //             extraPercentage: item.extraPercentage,
  //             finalUnitPrice: item.finalUnitPrice,
  //             totalPrice: item.totalPrice,
  //           },
  //         });

  //         for (const allocation of allocations) {
  //           await tx.saleInvoiceItemBatch.create({
  //             data: {
  //               saleInvoiceItemId: saleInvoiceItem.saleInvoiceItemId,
  //               batchId: allocation.batchId,
  //               baseQuantity: allocation.baseQuantity,
  //               unitCostAtSale: null,
  //             },
  //           });

  //           const willBeDepleted =
  //             allocation.baseQuantity >= allocation.availableBefore;

  //           await tx.batch.update({
  //             where: {
  //               batchId: allocation.batchId,
  //             },
  //             data: {
  //               soldQuantity: {
  //                 increment: allocation.baseQuantity,
  //               },

  //               ...(willBeDepleted
  //                 ? {
  //                     status: BatchStatus.DEPLETED,
  //                   }
  //                 : {}),
  //             },
  //           });
  //         }
  //       }

  //       return tx.saleInvoice.findUnique({
  //         where: {
  //           saleInvoiceId: saleInvoice.saleInvoiceId,
  //         },
  //         include: {
  //           pharmacyInvoice: {
  //             include: {
  //               patient: true,
  //             },
  //           },
  //           items: {
  //             include: {
  //               pharmacyDrug: true,
  //               batchAllocations: {
  //                 include: {
  //                   batch: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       });
  //     });
  //   }

  async execute(pharmacyId: number, dto: CreateSaleInvoiceDto) {
    this.validatePayload(dto);

    const computedItems = this.computeItems(dto);

    return this.unitOfWork.executeSerializable(async (tx) => {
      if (dto.idempotencyKey) {
        const existingInvoice = await tx.pharmacyInvoice.findFirst({
          where: {
            pharmacyId,
            idempotencyKey: dto.idempotencyKey,
          },
          include: {
            saleInvoice: {
              include: {
                items: {
                  include: {
                    batchAllocations: true,
                  },
                },
              },
            },
          },
        });

        if (existingInvoice?.saleInvoice) {
          return existingInvoice.saleInvoice;
        }
      }
      if (dto.patientId) {
        await this.assertPatientBelongsToPharmacy(
          tx,
          pharmacyId,
          dto.patientId,
        );
      }

      await this.assertPharmacyDrugsBelongToPharmacy(
        tx,
        pharmacyId,
        computedItems.map((item) => item.pharmacyDrugId),
      );

      /**
       * 1. Lock all relevant batch rows.
       * أي طلب بيع آخر لنفس الدفعات سينتظر هنا.
       */
      const lockedBatches = await this.lockAvailableBatchesForDrugs(
        tx,
        pharmacyId,
        computedItems.map((item) => item.pharmacyDrugId),
      );

      /**
       * 2. Allocate from locked rows only.
       */
      const allocationsByItemIndex = this.allocateFromLockedBatches(
        computedItems,
        lockedBatches,
      );

      const subtotal = this.roundMoney(
        computedItems.reduce((sum, item) => sum + item.totalPrice, 0),
      );

      const discount = this.roundMoney(dto.discount ?? 0);

      if (discount > subtotal) {
        throw new BadRequestException(
          'discount must not be greater than subtotal',
        );
      }

      const totalAmount = this.roundMoney(subtotal - discount);

      /**
       * 3. Create invoice records.
       */
      const pharmacyInvoice = await tx.pharmacyInvoice.create({
        data: {
          pharmacyId,
          patientId: dto.patientId ?? undefined,
          idempotencyKey: dto.idempotencyKey ?? undefined,
          invoiceType: 'SALE',
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          status: 'POSTED',
          notes: dto.notes?.trim() || undefined,
        },
      });

      const saleInvoice = await tx.saleInvoice.create({
        data: {
          pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
          paymentStatus: dto.paymentStatus ?? 'PENDING',
          saleType: dto.saleType ?? 'NORMAL',
          subtotal,
          discount,
          totalAmount,
        },
      });

      /**
       * 4. Create sale items and batch allocation records.
       */
      for (let index = 0; index < computedItems.length; index++) {
        const item = computedItems[index];
        const allocations = allocationsByItemIndex[index];

        const saleInvoiceItem = await tx.saleInvoiceItem.create({
          data: {
            saleInvoiceId: saleInvoice.saleInvoiceId,
            pharmacyDrugId: item.pharmacyDrugId,
            unitType: item.unitType as any,
            baseQuantity: item.baseQuantity,
            unitFactorToBase: item.unitFactorToBase,
            baseUnitPrice: item.baseUnitPrice,
            extraPercentage: item.extraPercentage,
            finalUnitPrice: item.finalUnitPrice,
            totalPrice: item.totalPrice,
          },
        });

        for (const allocation of allocations) {
          await tx.saleInvoiceItemBatch.create({
            data: {
              saleInvoiceItemId: saleInvoiceItem.saleInvoiceItemId,
              batchId: allocation.batchId,
              baseQuantity: allocation.baseQuantity,
              unitCostAtSale: null,
            },
          });
        }
      }

      /**
       * 5. Update batch outQuantity.
       */
      const batchIncrements = this.buildBatchOutQuantityIncrements(
        allocationsByItemIndex,
      );

      await this.incrementBatchOutQuantities(tx, batchIncrements);

      return tx.saleInvoice.findUnique({
        where: {
          saleInvoiceId: saleInvoice.saleInvoiceId,
        },
        include: {
          pharmacyInvoice: {
            include: {
              patient: true,
            },
          },
          items: {
            include: {
              pharmacyDrug: true,
              batchAllocations: {
                include: {
                  batch: true,
                },
              },
            },
          },
        },
      });
    });
  }

  private validatePayload(dto: CreateSaleInvoiceDto): void {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    const itemKeys = new Set<string>();

    for (const item of dto.items) {
      const key = `${item.pharmacyDrugId}:${item.unitType}`;

      if (itemKeys.has(key)) {
        throw new BadRequestException(
          `Duplicate item is not allowed for pharmacyDrugId ${item.pharmacyDrugId} and unitType ${item.unitType}`,
        );
      }

      itemKeys.add(key);

      if (item.displayQuantity <= 0) {
        throw new BadRequestException('displayQuantity must be greater than 0');
      }

      if (item.unitFactorToBase <= 0) {
        throw new BadRequestException(
          'unitFactorToBase must be greater than 0',
        );
      }

      if (item.finalUnitPrice < 0) {
        throw new BadRequestException('finalUnitPrice must not be negative');
      }
    }
  }

  private computeItems(dto: CreateSaleInvoiceDto): ComputedSaleItem[] {
    return dto.items.map((item) => {
      const displayQuantity = Number(item.displayQuantity);
      const unitFactorToBase = Number(item.unitFactorToBase);

      const baseQuantity = displayQuantity * unitFactorToBase;

      const finalUnitPrice = this.roundMoney(Number(item.finalUnitPrice));

      const baseUnitPrice = this.roundMoney(finalUnitPrice / unitFactorToBase);

      const extraPercentage = this.roundMoney(item.extraPercentage ?? 0);

      const totalPrice = this.roundMoney(displayQuantity * finalUnitPrice);

      return {
        pharmacyDrugId: item.pharmacyDrugId,
        unitType: item.unitType,
        displayQuantity,
        unitFactorToBase,
        baseQuantity,
        baseUnitPrice,
        extraPercentage,
        finalUnitPrice,
        totalPrice,
      };
    });
  }

  private async assertPatientBelongsToPharmacy(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    patientId: number,
  ): Promise<void> {
    const patient = await tx.patient.findFirst({
      where: {
        patientId,
        pharmacyId,
      },
      select: {
        patientId: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found for this pharmacy');
    }
  }

  private async assertPharmacyDrugsBelongToPharmacy(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    pharmacyDrugIds: number[],
  ): Promise<void> {
    const uniqueIds = [...new Set(pharmacyDrugIds)];

    const pharmacyDrugs = await tx.pharmacyDrug.findMany({
      where: {
        pharmacyId,
        pharmacyDrugId: {
          in: uniqueIds,
        },
        isActive: true,
      },
      select: {
        pharmacyDrugId: true,
      },
    });

    if (pharmacyDrugs.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more pharmacyDrugId values are invalid for this pharmacy',
      );
    }
  }

  private async allocateBatchesForItems(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    items: ComputedSaleItem[],
  ): Promise<BatchAllocation[][]> {
    const result: BatchAllocation[][] = [];

    for (const item of items) {
      const allocations = await this.allocateBatchesForItem(
        tx,
        pharmacyId,
        item,
      );

      result.push(allocations);
    }

    return result;
  }

  private async allocateBatchesForItem(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    item: ComputedSaleItem,
  ): Promise<BatchAllocation[]> {
    const batches = await tx.batch.findMany({
      where: {
        pharmacyDrugId: item.pharmacyDrugId,
        status: BatchStatus.ACTIVE,
        pharmacyDrug: {
          pharmacyId,
        },
      },
      select: {
        batchId: true,
        initialQuantity: true,
        soldQuantity: true,
        expiryDate: true,
        createdAt: true,
      },
      orderBy: [
        {
          expiryDate: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    const sortedBatches = batches.sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }

      if (!a.expiryDate) {
        return 1;
      }

      if (!b.expiryDate) {
        return -1;
      }

      return a.expiryDate.getTime() - b.expiryDate.getTime();
    });

    let remainingQuantity = item.baseQuantity;
    const allocations: BatchAllocation[] = [];

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) {
        break;
      }

      const available = batch.initialQuantity - batch.soldQuantity;

      if (available <= 0) {
        continue;
      }

      const quantityFromBatch = Math.min(available, remainingQuantity);

      allocations.push({
        batchId: batch.batchId,
        baseQuantity: quantityFromBatch,
        // availableBefore: available,
      });

      remainingQuantity -= quantityFromBatch;
    }

    if (remainingQuantity > 0) {
      throw new BadRequestException(
        `Insufficient stock for pharmacyDrugId ${item.pharmacyDrugId}`,
      );
    }

    return allocations;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private async lockAvailableBatchesForDrugs(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    pharmacyDrugIds: number[],
  ): Promise<LockedBatchRow[]> {
    const uniqueDrugIds = [...new Set(pharmacyDrugIds)].sort((a, b) => a - b);

    if (uniqueDrugIds.length === 0) {
      return [];
    }

    return tx.$queryRaw<LockedBatchRow[]>(Prisma.sql`
    SELECT
      b."batch_id" AS "batchId",
      b."pharmacy_drug_id" AS "pharmacyDrugId",
      b."initial_quantity" AS "initialQuantity",
      b."out_quantity" AS "soldQuantity",
      b."expiry_date" AS "expiryDate",
      b."created_at" AS "createdAt"
    FROM "batches" b
    INNER JOIN "pharmacy_drugs" pd
      ON pd."pharmacy_drug_id" = b."pharmacy_drug_id"
    WHERE
      pd."pharmacy_id" = ${pharmacyId}
      AND b."pharmacy_drug_id" IN (${Prisma.join(uniqueDrugIds)})
      AND b."status" = 'ACTIVE'
    ORDER BY
      b."pharmacy_drug_id" ASC,
      b."expiry_date" ASC NULLS LAST,
      b."created_at" ASC,
      b."batch_id" ASC
    FOR UPDATE
  `);
  }
  private allocateFromLockedBatches(
    computedItems: ComputedSaleItem[],
    lockedBatches: LockedBatchRow[],
  ): BatchAllocation[][] {
    const batchesByDrugId = new Map<number, LockedBatchRow[]>();

    for (const batch of lockedBatches) {
      const current = batchesByDrugId.get(batch.pharmacyDrugId) ?? [];
      current.push(batch);
      batchesByDrugId.set(batch.pharmacyDrugId, current);
    }

    const allocationsByItemIndex: BatchAllocation[][] = [];

    for (const item of computedItems) {
      const batches = batchesByDrugId.get(item.pharmacyDrugId) ?? [];

      let remainingQuantity = item.baseQuantity;
      const allocations: BatchAllocation[] = [];

      for (const batch of batches) {
        if (remainingQuantity <= 0) {
          break;
        }

        const availableQuantity = batch.initialQuantity - batch.soldQuantity;

        if (availableQuantity <= 0) {
          continue;
        }

        const quantityFromBatch = Math.min(
          availableQuantity,
          remainingQuantity,
        );

        allocations.push({
          batchId: batch.batchId,
          baseQuantity: quantityFromBatch,
        });

        /**
         * مهم جدًا:
         * نحدث النسخة المحلية حتى لو نفس الدواء موجود بسطرين في نفس الفاتورة،
         * مثل:
         * 2 BOX من Drug A
         * 2 STRIP من Drug A
         */
        batch.soldQuantity += quantityFromBatch;

        remainingQuantity -= quantityFromBatch;
      }

      if (remainingQuantity > 0) {
        throw new BadRequestException(
          `Insufficient stock for pharmacyDrugId ${item.pharmacyDrugId}`,
        );
      }

      allocationsByItemIndex.push(allocations);
    }

    return allocationsByItemIndex;
  }
  private buildBatchOutQuantityIncrements(
    allocationsByItemIndex: BatchAllocation[][],
  ): Map<number, number> {
    const increments = new Map<number, number>();

    for (const allocations of allocationsByItemIndex) {
      for (const allocation of allocations) {
        increments.set(
          allocation.batchId,
          (increments.get(allocation.batchId) ?? 0) + allocation.baseQuantity,
        );
      }
    }

    return increments;
  }
  private async incrementBatchOutQuantities(
    tx: Prisma.TransactionClient,
    increments: Map<number, number>,
  ): Promise<void> {
    for (const [batchId, increment] of increments) {
      const updatedRows = await tx.$queryRaw<{ batchId: number }[]>(Prisma.sql`
      UPDATE "batches"
      SET
        "out_quantity" = "out_quantity" + ${increment},
        "status" = CASE
          WHEN "initial_quantity" - ("out_quantity" + ${increment}) = 0
            THEN 'DEPLETED'::"BatchStatus"
          ELSE "status"
        END
      WHERE
        "batch_id" = ${batchId}
        AND ("initial_quantity" - "out_quantity") >= ${increment}
      RETURNING "batch_id" AS "batchId"
    `);

      if (updatedRows.length !== 1) {
        throw new BadRequestException(
          `Insufficient stock for batchId ${batchId}`,
        );
      }
    }
  }
}
