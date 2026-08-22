import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DrugSource,
  PaymentStatus,
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
  SaleType,
  UnitType,
} from '../../../generated/prisma/client';
import { ResolvePatientForInvoiceUseCase } from '../../patient/use-cases/resolve-patient-for-invoice.usecase';
import { PostSaleInvoiceCommand } from '../types/post-sale-invoice-command.type';

const saleInvoicePostingResultInclude = {
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
  returns: {
    where: {
      pharmacyInvoice: {
        status: PharmacyInvoiceStatus.POSTED,
      },
    },
    select: {
      subtotalRefund: true,
    },
  },
} satisfies Prisma.SaleInvoiceInclude;

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
  customerRequestItemId?: number;
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
  baseQuantity: number;
};

@Injectable()
export class SaleInvoicePostingService {
  constructor(
    private readonly resolvePatientForInvoiceUseCase: ResolvePatientForInvoiceUseCase,
  ) {}

  async post(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    command: PostSaleInvoiceCommand,
  ) {
    this.validatePayload(command);

    if (command.idempotencyKey) {
      const existingInvoice = await tx.saleInvoice.findFirst({
        where: {
          pharmacyInvoice: {
            pharmacyId,
            invoiceType: PharmacyInvoiceType.SALE,
            idempotencyKey: command.idempotencyKey,
          },
        },
        include: saleInvoicePostingResultInclude,
      });

      if (existingInvoice) {
        return existingInvoice;
      }
    }

    const patientId = await this.resolvePatientForInvoiceUseCase.execute(
      tx,
      pharmacyId,
      {
        patientId: command.patientId,
        patient: command.patient,
      },
    );

    const saleDrugContexts = await this.loadSaleDrugContexts(
      tx,
      pharmacyId,
      command.items.map((item) => item.pharmacyDrugId),
    );

    const computedItems = this.computeItems(command, saleDrugContexts);

    const lockedBatches = await this.lockAvailableBatchesForDrugs(
      tx,
      pharmacyId,
      computedItems.map((item) => item.pharmacyDrugId),
    );

    const allocationsByItemIndex = this.allocateFromLockedBatches(
      computedItems,
      lockedBatches,
    );

    const subtotal = this.roundMoney(
      computedItems.reduce((sum, item) => sum + item.totalPrice, 0),
    );

    const discount = this.roundMoney(command.discount ?? 0);

    if (discount > subtotal) {
      throw new BadRequestException(
        'discount must not be greater than subtotal',
      );
    }

    const discountedItems = this.distributeInvoiceDiscount(
      computedItems,
      discount,
    );

    const totalAmount = this.roundMoney(
      discountedItems.reduce((sum, item) => sum + item.netTotalPrice, 0),
    );

    const payment = this.resolvePayment(
      command.paymentStatus,
      command.paidAmount,
      totalAmount,
    );

    if (payment.paymentStatus !== PaymentStatus.PAID && !patientId) {
      throw new BadRequestException(
        'Patient is required for pending or partial sale invoices',
      );
    }

    const pharmacyInvoice = await tx.pharmacyInvoice.create({
      data: {
        pharmacyId,
        patientId,
        invoiceType: PharmacyInvoiceType.SALE,
        invoiceDate: command.invoiceDate
          ? new Date(command.invoiceDate)
          : new Date(),
        status: PharmacyInvoiceStatus.POSTED,
        notes: command.notes?.trim() || undefined,
        idempotencyKey: command.idempotencyKey ?? undefined,
      },
    });

    const saleInvoice = await tx.saleInvoice.create({
      data: {
        pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
        // paymentStatus: command.paymentStatus ?? PaymentStatus.PENDING,
        paymentStatus: payment.paymentStatus,
        paidAmount: payment.paidAmount,
        saleType: command.saleType,
        customerRequestId: command.customerRequestId ?? undefined,
        subtotal,
        discount,
        totalAmount,
      },
    });

    for (let index = 0; index < discountedItems.length; index++) {
      const item = discountedItems[index];
      const allocations = allocationsByItemIndex[index];

      const saleInvoiceItem = await tx.saleInvoiceItem.create({
        data: {
          saleInvoiceId: saleInvoice.saleInvoiceId,
          pharmacyDrugId: item.pharmacyDrugId,
          customerRequestItemId: item.customerRequestItemId ?? undefined,
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

    const batchIncrements = this.buildBatchOutQuantityIncrements(
      allocationsByItemIndex,
    );

    await this.incrementBatchOutQuantities(tx, batchIncrements);

    return tx.saleInvoice.findUniqueOrThrow({
      where: {
        saleInvoiceId: saleInvoice.saleInvoiceId,
      },
      include: saleInvoicePostingResultInclude,
    });
  }
  resolvePayment(
    requestedStatus: PaymentStatus | undefined,
    requestedPaidAmount: number | undefined,
    totalAmount: number,
  ): {
    paymentStatus: PaymentStatus;
    paidAmount: number;
  } {
    const paymentStatus = requestedStatus ?? PaymentStatus.PENDING;

    if (
      requestedPaidAmount !== undefined &&
      !Number.isFinite(requestedPaidAmount)
    ) {
      throw new BadRequestException('paidAmount must be a valid number');
    }

    const paidAmount = this.roundMoney(requestedPaidAmount ?? 0);

    if (paidAmount < 0) {
      throw new BadRequestException('paidAmount must not be negative');
    }

    if (totalAmount === 0) {
      if (paidAmount !== 0) {
        throw new BadRequestException(
          'paidAmount must be 0 when totalAmount is 0',
        );
      }

      if (paymentStatus === PaymentStatus.PARTIAL) {
        throw new BadRequestException(
          'A zero-total invoice cannot be partially paid',
        );
      }

      return {
        paymentStatus: PaymentStatus.PAID,
        paidAmount: 0,
      };
    }

    switch (paymentStatus) {
      case PaymentStatus.PENDING:
        if (paidAmount !== 0) {
          throw new BadRequestException(
            'paidAmount must be 0 when paymentStatus is PENDING',
          );
        }

        return {
          paymentStatus: PaymentStatus.PENDING,
          paidAmount: 0,
        };

      case PaymentStatus.PARTIAL:
        if (requestedPaidAmount === undefined) {
          throw new BadRequestException(
            'paidAmount is required when paymentStatus is PARTIAL',
          );
        }

        if (paidAmount <= 0 || paidAmount >= totalAmount) {
          throw new BadRequestException(
            'For PARTIAL payment, paidAmount must be greater than 0 and less than totalAmount',
          );
        }

        return {
          paymentStatus: PaymentStatus.PARTIAL,
          paidAmount,
        };

      case PaymentStatus.PAID:
        if (requestedPaidAmount !== undefined && paidAmount !== totalAmount) {
          throw new BadRequestException(
            'When paymentStatus is PAID, paidAmount must equal totalAmount',
          );
        }

        return {
          paymentStatus: PaymentStatus.PAID,
          paidAmount: totalAmount,
        };

      default:
        throw new BadRequestException('Invalid paymentStatus');
    }
  }

  private validatePayload(command: PostSaleInvoiceCommand): void {
    if (!Array.isArray(command.items) || command.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    if (command.patientId && command.patient) {
      throw new BadRequestException(
        'Send either patientId or patient, not both',
      );
    }

    if (
      command.customerRequestId !== undefined &&
      command.saleType !== SaleType.CUSTOMER_REQUEST
    ) {
      throw new BadRequestException(
        'customerRequestId requires saleType CUSTOMER_REQUEST',
      );
    }

    const itemKeys = new Set<string>();

    for (const item of command.items) {
      if (
        item.customerRequestItemId !== undefined &&
        command.customerRequestId === undefined
      ) {
        throw new BadRequestException(
          'customerRequestItemId requires customerRequestId',
        );
      }

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
    command: PostSaleInvoiceCommand,
    saleDrugContexts: Map<number, SaleDrugContext>,
  ): ComputedSaleItem[] {
    return command.items.map((item) => {
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
        customerRequestItemId: item.customerRequestItemId,
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
      if (batch.expiryDate && batch.expiryDate < new Date()) {
        throw new BadRequestException(
          `Cannot sell expired batchId ${requestedAllocation.batchId}`,
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
}
