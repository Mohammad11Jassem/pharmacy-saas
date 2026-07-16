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
  UnitType,
  DrugSource,
} from '../../../generated/prisma/client';
import { ResolvePatientForInvoiceUseCase } from '../../patient/use-cases/resolve-patient-for-invoice.usecase';

type ComputedSaleItem = {
  pharmacyDrugId: number;
  unitType: UnitType;
  displayQuantity: number;
  unitFactorToBase: number;
  baseQuantity: number;
  baseUnitPrice: number;
  extraPercentage: number;
  finalUnitPrice: number;
  totalPrice: number;
  requestedBatchAllocations?: RequestedBatchAllocation[];
};

type DiscountedSaleItem = ComputedSaleItem & {
  discountAmount: number;
  netTotalPrice: number;
};

type SaleDrugContext = {
  pharmacyDrugId: number;
  sellPart: boolean;
  consumerPrice: unknown | null;
  drug: {
    source: DrugSource;
    generalDrug: {
      unitsPerBox: number;
      consumerPrice: unknown;
      isActive: boolean;
    } | null;
    privateDrug: {
      unitsPerBox: number;
      isActive: boolean;
    } | null;
  };
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

type RequestedBatchAllocation = {
  batchId: number;
  displayQuantity: number;
  baseQuantity: number;
};

@Injectable()
export class CreateSaleInvoiceUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly resolvePatientForInvoiceUseCase: ResolvePatientForInvoiceUseCase,
  ) {}

  async execute(pharmacyId: number, dto: CreateSaleInvoiceDto) {
    this.validatePayload(dto);

    return this.unitOfWork.executeSerializable(async (tx) => {
      if (dto.idempotencyKey) {
        const existingInvoice = await tx.pharmacyInvoice.findFirst({
          where: {
            pharmacyId,
            invoiceType: PharmacyInvoiceType.SALE,
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

      const patientId = await this.resolvePatientForInvoiceUseCase.execute(
        tx,
        pharmacyId,
        {
          patientId: dto.patientId,
          patient: dto.patient,
        },
      );

      // ممكن حذف assertPharmacyDrugsBelongToPharmacy
      //   await this.assertPharmacyDrugsBelongToPharmacy(
      //     tx,
      //     pharmacyId,
      //     computedItems.map((item) => item.pharmacyDrugId),
      //   );

      const saleDrugContexts = await this.loadSaleDrugContexts(
        tx,
        pharmacyId,
        dto.items.map((item) => item.pharmacyDrugId),
      );

      const computedItems = this.computeItems(dto, saleDrugContexts);

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
      // const totalAmount = this.roundMoney(subtotal - discount);

      // Distribute the invoice discount across all items
      const discountedItems = this.distributeInvoiceDiscount(
        computedItems,
        discount,
      );

      const totalAmount = this.roundMoney(
        discountedItems.reduce((sum, item) => sum + item.netTotalPrice, 0),
      );

      /**
       * 3. Create invoice records.
       */
      const pharmacyInvoice = await tx.pharmacyInvoice.create({
        data: {
          pharmacyId,
          patientId,
          invoiceType: PharmacyInvoiceType.SALE,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          status: PharmacyInvoiceStatus.POSTED,
          notes: dto.notes?.trim() || undefined,
          idempotencyKey: dto.idempotencyKey ?? undefined,
        },
      });

      const saleInvoice = await tx.saleInvoice.create({
        data: {
          pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
          paymentStatus: dto.paymentStatus ?? PaymentStatus.PENDING,
          saleType: dto.saleType ?? SaleType.NORMAL,
          subtotal,
          discount,
          totalAmount,
        },
      });

      /**
       * 4. Create sale items and batch allocation records.
       */
      for (let index = 0; index < computedItems.length; index++) {
        const item = discountedItems[index];
        const allocations = allocationsByItemIndex[index];

        const saleInvoiceItem = await tx.saleInvoiceItem.create({
          data: {
            saleInvoiceId: saleInvoice.saleInvoiceId,
            pharmacyDrugId: item.pharmacyDrugId,
            unitType: item.unitType,
            baseQuantity: item.baseQuantity,
            unitFactorToBase: item.unitFactorToBase,
            baseUnitPrice: item.baseUnitPrice,
            extraPercentage: item.extraPercentage,
            finalUnitPrice: item.finalUnitPrice,
            totalPrice: item.totalPrice,
            discountAmount: item.discountAmount,
            netTotalPrice: item.netTotalPrice,
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

    if (dto.patientId && dto.patient) {
      throw new BadRequestException(
        'Send either patientId or patient, not both',
      );
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

      if (item.extraPercentage !== undefined && item.extraPercentage < 0) {
        throw new BadRequestException('extraPercentage must not be negative');
      }

      if (item.manualUnitPrice !== undefined && item.manualUnitPrice < 0) {
        throw new BadRequestException('manualUnitPrice must not be negative');
      }

      if (
        item.manualUnitPrice !== undefined &&
        item.extraPercentage !== undefined
      ) {
        throw new BadRequestException(
          'Send either manualUnitPrice or extraPercentage, not both',
        );
      }

      if (item.batchAllocations?.length) {
        const batchIds = new Set<number>();
        let totalAllocatedDisplayQuantity = 0;

        for (const allocation of item.batchAllocations) {
          if (batchIds.has(allocation.batchId)) {
            throw new BadRequestException(
              `Duplicate batchId ${allocation.batchId} is not allowed in the same sale item`,
            );
          }

          batchIds.add(allocation.batchId);

          if (allocation.displayQuantity <= 0) {
            throw new BadRequestException(
              'batchAllocations.displayQuantity must be greater than 0',
            );
          }

          totalAllocatedDisplayQuantity += allocation.displayQuantity;
        }

        if (totalAllocatedDisplayQuantity !== item.displayQuantity) {
          throw new BadRequestException(
            `Sum of batchAllocations.displayQuantity must equal item.displayQuantity for pharmacyDrugId ${item.pharmacyDrugId}`,
          );
        }
      }
    }
  }

  private computeItems(
    dto: CreateSaleInvoiceDto,
    saleDrugContexts: Map<number, SaleDrugContext>,
  ): ComputedSaleItem[] {
    return dto.items.map((item) => {
      const pharmacyDrug = saleDrugContexts.get(item.pharmacyDrugId);

      if (!pharmacyDrug) {
        throw new BadRequestException(
          `Invalid pharmacyDrugId ${item.pharmacyDrugId}`,
        );
      }

      const displayQuantity = Number(item.displayQuantity);

      const unitsPerBox = this.resolveUnitsPerBox(pharmacyDrug);

      const unitFactorToBase = this.resolveUnitFactorToBase(
        pharmacyDrug,
        item.unitType,
        unitsPerBox,
      );

      const baseQuantity = displayQuantity * unitFactorToBase;

      const requestedBatchAllocations = item.batchAllocations?.map(
        (allocation) => ({
          batchId: allocation.batchId,
          displayQuantity: Number(allocation.displayQuantity),
          baseQuantity: Number(allocation.displayQuantity) * unitFactorToBase,
        }),
      );

      const suggestedUnitPrice = this.resolveSuggestedUnitPrice(
        pharmacyDrug,
        item.unitType,
        unitsPerBox,
      );

      const hasManualPrice = item.manualUnitPrice !== undefined;

      const extraPercentage = hasManualPrice
        ? 0
        : this.roundMoney(item.extraPercentage ?? 0);

      const finalUnitPrice = hasManualPrice
        ? this.resolveManualUnitPrice(item.manualUnitPrice, {
            pharmacyDrugId: item.pharmacyDrugId,
            suggestedUnitPrice,
          })
        : this.roundMoney(suggestedUnitPrice * (1 + extraPercentage / 100));

      const baseUnitPrice = this.roundMoney(finalUnitPrice / unitFactorToBase);

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
        requestedBatchAllocations,
      };
    });
  }

  private async loadSaleDrugContexts(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    pharmacyDrugIds: number[],
  ): Promise<Map<number, SaleDrugContext>> {
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
        sellPart: true,
        consumerPrice: true,
        drug: {
          select: {
            source: true,
            generalDrug: {
              select: {
                unitsPerBox: true,
                consumerPrice: true,
                isActive: true,
              },
            },
            privateDrug: {
              select: {
                unitsPerBox: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (pharmacyDrugs.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more pharmacyDrugId values are invalid for this pharmacy',
      );
    }

    const result = new Map<number, SaleDrugContext>();

    for (const pharmacyDrug of pharmacyDrugs) {
      if (pharmacyDrug.drug.source === DrugSource.GENERAL) {
        if (!pharmacyDrug.drug.generalDrug) {
          throw new BadRequestException(
            `General drug data not found for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
          );
        }

        if (!pharmacyDrug.drug.generalDrug.isActive) {
          throw new BadRequestException(
            `Drug is inactive for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
          );
        }
      }

      if (pharmacyDrug.drug.source === DrugSource.PRIVATE) {
        if (!pharmacyDrug.drug.privateDrug) {
          throw new BadRequestException(
            `Private drug data not found for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
          );
        }

        if (!pharmacyDrug.drug.privateDrug.isActive) {
          throw new BadRequestException(
            `Drug is inactive for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
          );
        }
      }

      result.set(pharmacyDrug.pharmacyDrugId, pharmacyDrug);
    }

    return result;
  }

  private resolveManualUnitPrice(
    manualUnitPrice: number | undefined,
    context: {
      pharmacyDrugId: number;
      suggestedUnitPrice: number;
    },
  ): number {
    if (manualUnitPrice === undefined) {
      throw new BadRequestException('manualUnitPrice is required');
    }

    const price = this.roundMoney(Number(manualUnitPrice));

    if (Number.isNaN(price)) {
      throw new BadRequestException('manualUnitPrice must be a valid number');
    }

    if (price <= 0) {
      throw new BadRequestException(
        `manualUnitPrice must be greater than 0 for pharmacyDrugId ${context.pharmacyDrugId}`,
      );
    }

    return price;
  }
  private resolveUnitsPerBox(pharmacyDrug: SaleDrugContext): number {
    const unitsPerBox =
      pharmacyDrug.drug.source === DrugSource.GENERAL
        ? pharmacyDrug.drug.generalDrug?.unitsPerBox
        : pharmacyDrug.drug.privateDrug?.unitsPerBox;

    if (!unitsPerBox || unitsPerBox <= 0) {
      throw new BadRequestException(
        `unitsPerBox is not configured for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
      );
    }

    return unitsPerBox;
  }

  private resolveUnitFactorToBase(
    pharmacyDrug: SaleDrugContext,
    unitType: UnitType,
    unitsPerBox: number,
  ): number {
    switch (unitType) {
      case UnitType.BOX:
        return unitsPerBox;

      case UnitType.STRIP:
        if (!pharmacyDrug.sellPart) {
          throw new BadRequestException(
            `pharmacyDrugId ${pharmacyDrug.pharmacyDrugId} cannot be sold as STRIP`,
          );
        }

        return 1;

      case UnitType.TABLET:
        throw new BadRequestException('TABLET sale is not supported yet');

      default:
        throw new BadRequestException(`Unsupported unitType ${unitType}`);
    }
  }

  private resolveSuggestedUnitPrice(
    pharmacyDrug: SaleDrugContext,
    unitType: UnitType,
    unitsPerBox: number,
  ): number {
    const boxPrice = this.resolveBoxPrice(pharmacyDrug);

    switch (unitType) {
      case UnitType.BOX:
        return boxPrice;

      case UnitType.STRIP:
        if (!pharmacyDrug.sellPart) {
          throw new BadRequestException(
            `pharmacyDrugId ${pharmacyDrug.pharmacyDrugId} cannot be sold as STRIP`,
          );
        }

        return this.roundMoney(boxPrice / unitsPerBox);

      case UnitType.TABLET:
        throw new BadRequestException('TABLET sale is not supported yet');

      default:
        throw new BadRequestException(`Unsupported unitType ${unitType}`);
    }
  }

  private resolveBoxPrice(pharmacyDrug: SaleDrugContext): number {
    const pharmacySpecificPrice =
      pharmacyDrug.consumerPrice !== null &&
      pharmacyDrug.consumerPrice !== undefined
        ? Number(pharmacyDrug.consumerPrice)
        : null;

    if (pharmacySpecificPrice !== null && pharmacySpecificPrice > 0) {
      return this.roundMoney(pharmacySpecificPrice);
    }

    if (pharmacyDrug.drug.source === DrugSource.GENERAL) {
      const generalPrice = pharmacyDrug.drug.generalDrug?.consumerPrice;

      if (generalPrice !== null && generalPrice !== undefined) {
        const price = Number(generalPrice);

        if (price > 0) {
          return this.roundMoney(price);
        }
      }
    }

    throw new BadRequestException(
      `consumerPrice is not configured for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
    );
  }

  private distributeInvoiceDiscount(
    items: ComputedSaleItem[],
    discount: number,
  ): DiscountedSaleItem[] {
    const discountCents = this.toCents(discount);

    // No discount
    if (discountCents === 0) {
      return items.map((item) => ({
        ...item,
        discountAmount: 0,
        netTotalPrice: item.totalPrice,
      }));
    }

    const itemTotalCents = items.map((item) => this.toCents(item.totalPrice));

    const subtotalCents = itemTotalCents.reduce((sum, value) => sum + value, 0);

    if (subtotalCents <= 0) {
      throw new BadRequestException(
        'subtotal must be greater than 0 to distribute discount',
      );
    }

    const subtotalBigInt = BigInt(subtotalCents);

    /**
     * Calculate each item's proportional discount.
     * We first allocate full cents only.
     */
    const allocations = itemTotalCents.map((totalCents, index) => {
      const numerator = BigInt(discountCents) * BigInt(totalCents);

      return {
        index,
        discountCents: Number(numerator / subtotalBigInt),
        remainder: numerator % subtotalBigInt,
      };
    });

    let remainingCents =
      discountCents -
      allocations.reduce((sum, item) => sum + item.discountCents, 0);

    /**
     * Give remaining cents to items with the largest remainder.
     * This guarantees the distributed discount equals the invoice discount.
     */
    const allocationOrder = [...allocations].sort((a, b) => {
      if (a.remainder === b.remainder) {
        return a.index - b.index;
      }

      return a.remainder > b.remainder ? -1 : 1;
    });

    for (
      let index = 0;
      index < allocationOrder.length && remainingCents > 0;
      index++
    ) {
      allocationOrder[index].discountCents += 1;
      remainingCents -= 1;
    }

    const discountByItemIndex = new Map(
      allocations.map((item) => [item.index, item.discountCents]),
    );

    return items.map((item, index) => {
      const itemDiscountCents = discountByItemIndex.get(index) ?? 0;

      const totalPriceCents = itemTotalCents[index];

      return {
        ...item,

        discountAmount: this.fromCents(itemDiscountCents),

        netTotalPrice: this.fromCents(totalPriceCents - itemDiscountCents),
      };
    });
  }

  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  private fromCents(value: number): number {
    return value / 100;
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
      b."sold_quantity" AS "soldQuantity",
      b."expiry_date" AS "expiryDate",
      b."created_at" AS "createdAt"
    FROM "batches" b
    INNER JOIN "pharmacy_drugs" pd
      ON pd."pharmacy_drug_id" = b."pharmacy_drug_id"
    WHERE
      pd."pharmacy_id" = ${pharmacyId}
      AND b."pharmacy_drug_id" IN (${Prisma.join(uniqueDrugIds)})
      AND b."status" = 'ACTIVE'
      AND (
        -- b."expiry_date" IS NULL OR
        b."expiry_date" >= CURRENT_DATE
      )
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
    const batchById = new Map<number, LockedBatchRow>();

    for (const batch of lockedBatches) {
      const current = batchesByDrugId.get(batch.pharmacyDrugId) ?? [];
      current.push(batch);
      batchesByDrugId.set(batch.pharmacyDrugId, current);

      batchById.set(batch.batchId, batch);
    }

    const allocationsByItemIndex: BatchAllocation[][] = [];

    for (const item of computedItems) {
      if (item.requestedBatchAllocations?.length) {
        const manualAllocations = this.allocateFromRequestedBatches(
          item,
          batchById,
        );

        allocationsByItemIndex.push(manualAllocations);
        continue;
      }

      const automaticAllocations = this.allocateAutomaticallyFromLockedBatches(
        item,
        batchesByDrugId.get(item.pharmacyDrugId) ?? [],
      );

      allocationsByItemIndex.push(automaticAllocations);
    }

    return allocationsByItemIndex;
  }

  private allocateFromRequestedBatches(
    item: ComputedSaleItem,
    batchById: Map<number, LockedBatchRow>,
  ): BatchAllocation[] {
    if (!item.requestedBatchAllocations?.length) {
      throw new BadRequestException('requestedBatchAllocations is required');
    }

    const allocations: BatchAllocation[] = [];
    let totalRequestedBaseQuantity = 0;

    for (const requestedAllocation of item.requestedBatchAllocations) {
      const batch = batchById.get(requestedAllocation.batchId);

      if (!batch) {
        throw new BadRequestException(
          `batchId ${requestedAllocation.batchId} is not available or does not belong to this pharmacy`,
        );
      }

      if (batch.pharmacyDrugId !== item.pharmacyDrugId) {
        throw new BadRequestException(
          `batchId ${requestedAllocation.batchId} does not belong to pharmacyDrugId ${item.pharmacyDrugId}`,
        );
      }

      const availableQuantity = batch.initialQuantity - batch.soldQuantity;

      if (availableQuantity < requestedAllocation.baseQuantity) {
        throw new BadRequestException(
          `Insufficient stock in batchId ${requestedAllocation.batchId}`,
        );
      }

      allocations.push({
        batchId: requestedAllocation.batchId,
        baseQuantity: requestedAllocation.baseQuantity,
      });

      /**
       * مهم جداً:
       * نحدث النسخة المحلية حتى لو نفس batch استُخدم في item آخر داخل نفس الفاتورة.
       */
      batch.soldQuantity += requestedAllocation.baseQuantity;

      totalRequestedBaseQuantity += requestedAllocation.baseQuantity;
    }

    if (totalRequestedBaseQuantity !== item.baseQuantity) {
      throw new BadRequestException(
        `Selected batch quantities do not match item quantity for pharmacyDrugId ${item.pharmacyDrugId}`,
      );
    }

    return allocations;
  }

  private allocateAutomaticallyFromLockedBatches(
    item: ComputedSaleItem,
    batches: LockedBatchRow[],
  ): BatchAllocation[] {
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

      const quantityFromBatch = Math.min(availableQuantity, remainingQuantity);

      allocations.push({
        batchId: batch.batchId,
        baseQuantity: quantityFromBatch,
      });

      batch.soldQuantity += quantityFromBatch;

      remainingQuantity -= quantityFromBatch;
    }

    if (remainingQuantity > 0) {
      throw new BadRequestException(
        `Insufficient stock for pharmacyDrugId ${item.pharmacyDrugId}`,
      );
    }

    return allocations;
  }
  //   private allocateFromLockedBatches(
  //     computedItems: ComputedSaleItem[],
  //     lockedBatches: LockedBatchRow[],
  //   ): BatchAllocation[][] {
  //     const batchesByDrugId = new Map<number, LockedBatchRow[]>();

  //     for (const batch of lockedBatches) {
  //       const current = batchesByDrugId.get(batch.pharmacyDrugId) ?? [];
  //       current.push(batch);
  //       batchesByDrugId.set(batch.pharmacyDrugId, current);
  //     }

  //     const allocationsByItemIndex: BatchAllocation[][] = [];

  //     for (const item of computedItems) {
  //       const batches = batchesByDrugId.get(item.pharmacyDrugId) ?? [];

  //       let remainingQuantity = item.baseQuantity;
  //       const allocations: BatchAllocation[] = [];

  //       for (const batch of batches) {
  //         if (remainingQuantity <= 0) {
  //           break;
  //         }

  //         const availableQuantity = batch.initialQuantity - batch.soldQuantity;

  //         if (availableQuantity <= 0) {
  //           continue;
  //         }

  //         const quantityFromBatch = Math.min(
  //           availableQuantity,
  //           remainingQuantity,
  //         );

  //         allocations.push({
  //           batchId: batch.batchId,
  //           baseQuantity: quantityFromBatch,
  //         });

  //         /**
  //          * مهم جدًا:
  //          * نحدث النسخة المحلية حتى لو نفس الدواء موجود بسطرين في نفس الفاتورة،
  //          * مثل:
  //          * 2 BOX من Drug A
  //          * 2 STRIP من Drug A
  //          */
  //         batch.soldQuantity += quantityFromBatch;

  //         remainingQuantity -= quantityFromBatch;
  //       }

  //       if (remainingQuantity > 0) {
  //         throw new BadRequestException(
  //           `Insufficient stock for pharmacyDrugId ${item.pharmacyDrugId}`,
  //         );
  //       }

  //       allocationsByItemIndex.push(allocations);
  //     }

  //     return allocationsByItemIndex;
  //   }
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
        "sold_quantity" = "sold_quantity" + ${increment},
        "status" = CASE
          WHEN "initial_quantity" - ("sold_quantity" + ${increment}) = 0
            THEN 'DEPLETED'::"BatchStatus"
          ELSE "status"
        END
      WHERE
        "batch_id" = ${batchId}
        AND ("initial_quantity" - "sold_quantity") >= ${increment}
      RETURNING "batch_id" AS "batchId"
    `);

      if (updatedRows.length !== 1) {
        throw new BadRequestException(
          `Insufficient stock for batchId ${batchId}`,
        );
      }
    }
  }

  //   private async assertPatientBelongsToPharmacy(
  //     tx: Prisma.TransactionClient,
  //     pharmacyId: number,
  //     patientId: number,
  //   ): Promise<void> {
  //     const patient = await tx.patient.findFirst({
  //       where: {
  //         patientId,
  //         pharmacyId,
  //       },
  //       select: {
  //         patientId: true,
  //       },
  //     });

  //     if (!patient) {
  //       throw new NotFoundException('Patient not found for this pharmacy');
  //     }
  //   }

  //   private async allocateBatchesForItem(
  //     tx: Prisma.TransactionClient,
  //     pharmacyId: number,
  //     item: ComputedSaleItem,
  //   ): Promise<BatchAllocation[]> {
  //     const batches = await tx.batch.findMany({
  //       where: {
  //         pharmacyDrugId: item.pharmacyDrugId,
  //         status: BatchStatus.ACTIVE,
  //         pharmacyDrug: {
  //           pharmacyId,
  //         },
  //       },
  //       select: {
  //         batchId: true,
  //         initialQuantity: true,
  //         soldQuantity: true,
  //         expiryDate: true,
  //         createdAt: true,
  //       },
  //       orderBy: [
  //         {
  //           expiryDate: 'asc',
  //         },
  //         {
  //           createdAt: 'asc',
  //         },
  //       ],
  //     });

  //     const sortedBatches = batches.sort((a, b) => {
  //       if (!a.expiryDate && !b.expiryDate) {
  //         return a.createdAt.getTime() - b.createdAt.getTime();
  //       }

  //       if (!a.expiryDate) {
  //         return 1;
  //       }

  //       if (!b.expiryDate) {
  //         return -1;
  //       }

  //       return a.expiryDate.getTime() - b.expiryDate.getTime();
  //     });

  //     let remainingQuantity = item.baseQuantity;
  //     const allocations: BatchAllocation[] = [];

  //     for (const batch of sortedBatches) {
  //       if (remainingQuantity <= 0) {
  //         break;
  //       }

  //       const available = batch.initialQuantity - batch.soldQuantity;

  //       if (available <= 0) {
  //         continue;
  //       }

  //       const quantityFromBatch = Math.min(available, remainingQuantity);

  //       allocations.push({
  //         batchId: batch.batchId,
  //         baseQuantity: quantityFromBatch,
  //         // availableBefore: available,
  //       });

  //       remainingQuantity -= quantityFromBatch;
  //     }

  //     if (remainingQuantity > 0) {
  //       throw new BadRequestException(
  //         `Insufficient stock for pharmacyDrugId ${item.pharmacyDrugId}`,
  //       );
  //     }

  //     return allocations;
  //   }
  //   private async resolvePatientId(
  //     tx: Prisma.TransactionClient,
  //     pharmacyId: number,
  //     dto: CreateSaleInvoiceDto,
  //   ): Promise<number | undefined> {
  //     if (dto.patientId) {
  //       await this.assertPatientBelongsToPharmacy(tx, pharmacyId, dto.patientId);

  //       return dto.patientId;
  //     }

  //     if (!dto.patient) {
  //       return undefined;
  //     }

  //     const fullName = dto.patient.fullName?.trim();

  //     if (!fullName) {
  //       throw new BadRequestException('patient.fullName is required');
  //     }

  //     /**
  //      * إذا أرسل رقم هاتف، نحاول إيجاد مريض بنفس الرقم داخل نفس الصيدلية.
  //      * هذا يمنع تكرار نفس المريض عدة مرات.
  //      */
  //     if (dto.patient.phone) {
  //       const existingPatient = await tx.patient.findFirst({
  //         where: {
  //           pharmacyId,
  //           phone: dto.patient.phone.trim(),
  //         },
  //         select: {
  //           patientId: true,
  //         },
  //       });

  //       if (existingPatient) {
  //         return existingPatient.patientId;
  //       }
  //     }

  //     const createdPatient = await tx.patient.create({
  //       data: {
  //         pharmacyId,
  //         fullName,
  //         phone: dto.patient.phone?.trim() || undefined,
  //         nationalId: dto.patient.nationalId?.trim() || undefined,
  //       },
  //       select: {
  //         patientId: true,
  //       },
  //     });

  //     return createdPatient.patientId;
  //   }

  //   private async assertPharmacyDrugsBelongToPharmacy(
  //     tx: Prisma.TransactionClient,
  //     pharmacyId: number,
  //     pharmacyDrugIds: number[],
  //   ): Promise<void> {
  //     const uniqueIds = [...new Set(pharmacyDrugIds)];

  //     const pharmacyDrugs = await tx.pharmacyDrug.findMany({
  //       where: {
  //         pharmacyId,
  //         pharmacyDrugId: {
  //           in: uniqueIds,
  //         },
  //         isActive: true,
  //       },
  //       select: {
  //         pharmacyDrugId: true,
  //       },
  //     });

  //     if (pharmacyDrugs.length !== uniqueIds.length) {
  //       throw new BadRequestException(
  //         'One or more pharmacyDrugId values are invalid for this pharmacy',
  //       );
  //     }
  //   }

  //   private async allocateBatchesForItems(
  //     tx: Prisma.TransactionClient,
  //     pharmacyId: number,
  //     items: ComputedSaleItem[],
  //   ): Promise<BatchAllocation[][]> {
  //     const result: BatchAllocation[][] = [];

  //     for (const item of items) {
  //       const allocations = await this.allocateBatchesForItem(
  //         tx,
  //         pharmacyId,
  //         item,
  //       );

  //       result.push(allocations);
  //     }

  //     return result;
  //   }

  //   private computeItems(dto: CreateSaleInvoiceDto): ComputedSaleItem[] {
  //     return dto.items.map((item) => {
  //       const displayQuantity = Number(item.displayQuantity);
  //       const unitFactorToBase = Number(item.unitFactorToBase);

  //       const baseQuantity = displayQuantity * unitFactorToBase;

  //       const finalUnitPrice = this.roundMoney(Number(item.finalUnitPrice));

  //       const baseUnitPrice = this.roundMoney(finalUnitPrice / unitFactorToBase);

  //       const extraPercentage = this.roundMoney(item.extraPercentage ?? 0);

  //       const totalPrice = this.roundMoney(displayQuantity * finalUnitPrice);

  //       return {
  //         pharmacyDrugId: item.pharmacyDrugId,
  //         unitType: item.unitType,
  //         displayQuantity,
  //         unitFactorToBase,
  //         baseQuantity,
  //         baseUnitPrice,
  //         extraPercentage,
  //         finalUnitPrice,
  //         totalPrice,
  //       };
  //     });
  //   }
}
