import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
  UnitType,
} from '../../../generated/prisma/client';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { CreateReturnInvoiceDto } from '../dto/create-return-invoice.dto';

type ComputedReturnItem = {
  saleInvoiceItemBatchId: number;
  unitType: UnitType;
  displayQuantity: number;
  unitFactorToBase: number;
  baseQuantity: number;
  returnReason?: string;
  restockToInventory: boolean;
};

type LockedSaleAllocationRow = {
  saleInvoiceItemBatchId: number;
  saleInvoiceItemId: number;
  batchId: number;
  allocatedBaseQuantity: number;
  pharmacyDrugId: number;
  baseUnitPrice: Prisma.Decimal;
  saleUnitType: UnitType;
  saleUnitFactorToBase: number;
};

@Injectable()
export class CreateReturnInvoiceUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(pharmacyId: number, dto: CreateReturnInvoiceDto) {
    this.validatePayload(dto);

    // const computedItems = this.computeItems(dto);

    return this.unitOfWork.executeSerializable(async (tx) => {
      const existingReturnInvoice =
        await this.findExistingReturnInvoiceByIdempotencyKey(
          tx,
          pharmacyId,
          dto.idempotencyKey,
        );

      if (existingReturnInvoice) {
        return existingReturnInvoice;
      }

      const referenceSaleInvoice = await this.findReferenceSaleInvoiceOrThrow(
        tx,
        pharmacyId,
        dto.referenceSaleInvoiceId,
      );

      const lockedAllocations = await this.lockSaleAllocationsForReturn(
        tx,
        pharmacyId,
        dto.referenceSaleInvoiceId,
        dto.items.map((item) => item.saleInvoiceItemBatchId),
      );

      this.assertAllRequestedAllocationsExist(dto.items, lockedAllocations);

      const computedItems = this.computeItems(dto, lockedAllocations);

      await this.assertReturnQuantitiesAreValid(
        tx,
        computedItems,
        lockedAllocations,
      );

      const allocationById = new Map(
        lockedAllocations.map((allocation) => [
          allocation.saleInvoiceItemBatchId,
          allocation,
        ]),
      );

      const computedItemsWithPrices = computedItems.map((item) => {
        const allocation = allocationById.get(item.saleInvoiceItemBatchId);

        if (!allocation) {
          throw new BadRequestException(
            `Invalid saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
          );
        }

        const baseUnitPrice = Number(allocation.baseUnitPrice);

        const unitPrice = this.roundMoney(
          baseUnitPrice * item.unitFactorToBase,
        );

        const totalPrice = this.roundMoney(baseUnitPrice * item.baseQuantity);

        return {
          ...item,
          pharmacyDrugId: allocation.pharmacyDrugId,
          batchId: allocation.batchId,
          unitPrice,
          totalPrice,
        };
      });

      const subtotalRefund = this.roundMoney(
        computedItemsWithPrices.reduce((sum, item) => sum + item.totalPrice, 0),
      );

      const pharmacyInvoice = await tx.pharmacyInvoice.create({
        data: {
          pharmacyId,
          patientId:
            referenceSaleInvoice.pharmacyInvoice.patientId ?? undefined,
          invoiceType: PharmacyInvoiceType.RETURN,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          status: PharmacyInvoiceStatus.POSTED,
          notes: dto.notes?.trim() || undefined,
          idempotencyKey: dto.idempotencyKey ?? undefined,
        },
      });

      const returnInvoice = await tx.returnInvoice.create({
        data: {
          pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
          referenceSaleInvoiceId: dto.referenceSaleInvoiceId,
          subtotalRefund,
        },
      });

      for (const item of computedItemsWithPrices) {
        await tx.returnInvoiceItem.create({
          data: {
            returnInvoiceId: returnInvoice.returnInvoiceId,

            pharmacyDrugId: item.pharmacyDrugId,

            saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,

            unitType: item.unitType,
            baseQuantity: item.baseQuantity,
            unitFactorToBase: item.unitFactorToBase,

            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,

            returnReason: item.returnReason as any,
            restockToInventory: item.restockToInventory,
          },
        });
      }

      const batchRestockDecrements = this.buildBatchRestockDecrements(
        computedItemsWithPrices,
      );

      await this.decrementBatchSoldQuantities(tx, batchRestockDecrements);

      return this.findReturnInvoiceWithDetails(
        tx,
        returnInvoice.returnInvoiceId,
      );
    });
  }

  private validatePayload(dto: CreateReturnInvoiceDto): void {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    const itemKeys = new Set<string>();

    for (const item of dto.items) {
      const key = `${item.saleInvoiceItemBatchId}:${item.unitType}`;

      if (itemKeys.has(key)) {
        throw new BadRequestException(
          `Duplicate return item is not allowed for saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId} and unitType ${item.unitType}`,
        );
      }

      itemKeys.add(key);

      if (item.displayQuantity <= 0) {
        throw new BadRequestException('displayQuantity must be greater than 0');
      }
    }
  }

  //   private computeItems(dto: CreateReturnInvoiceDto): ComputedReturnItem[] {
  //     return dto.items.map((item) => ({
  //       saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,
  //       unitType: item.unitType,
  //       displayQuantity: item.displayQuantity,
  //       unitFactorToBase: item.unitFactorToBase,
  //       baseQuantity: item.displayQuantity * item.unitFactorToBase,
  //       returnReason: item.returnReason,
  //       restockToInventory: item.restockToInventory ?? true,
  //     }));
  //   }

  private computeItems(
    dto: CreateReturnInvoiceDto,
    lockedAllocations: LockedSaleAllocationRow[],
  ): ComputedReturnItem[] {
    const allocationById = new Map(
      lockedAllocations.map((allocation) => [
        allocation.saleInvoiceItemBatchId,
        allocation,
      ]),
    );

    return dto.items.map((item) => {
      const allocation = allocationById.get(item.saleInvoiceItemBatchId);

      if (!allocation) {
        throw new BadRequestException(
          `Invalid saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
        );
      }

      const unitFactorToBase = this.resolveReturnUnitFactorToBase(
        item.unitType,
        allocation,
      );

      const displayQuantity = Number(item.displayQuantity);

      const baseQuantity = displayQuantity * unitFactorToBase;

      return {
        saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,
        unitType: item.unitType,
        displayQuantity,
        unitFactorToBase,
        baseQuantity,
        returnReason: item.returnReason,
        restockToInventory: item.restockToInventory ?? true,
      };
    });
  }

  private async findExistingReturnInvoiceByIdempotencyKey(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    const existingPharmacyInvoice = await tx.pharmacyInvoice.findFirst({
      where: {
        pharmacyId,
        invoiceType: PharmacyInvoiceType.RETURN,
        idempotencyKey,
      },
      include: {
        returnInvoice: true,
      },
    });

    if (!existingPharmacyInvoice?.returnInvoice) {
      return null;
    }

    return this.findReturnInvoiceWithDetails(
      tx,
      existingPharmacyInvoice.returnInvoice.returnInvoiceId,
    );
  }

  private async findReferenceSaleInvoiceOrThrow(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    saleInvoiceId: number,
  ) {
    const saleInvoice = await tx.saleInvoice.findFirst({
      where: {
        saleInvoiceId,
        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.SALE,
          status: PharmacyInvoiceStatus.POSTED,
        },
      },
      include: {
        pharmacyInvoice: true,
      },
    });

    if (!saleInvoice) {
      throw new NotFoundException('Reference sale invoice not found');
    }

    return saleInvoice;
  }

  private async lockSaleAllocationsForReturn(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    referenceSaleInvoiceId: number,
    saleInvoiceItemBatchIds: number[],
  ): Promise<LockedSaleAllocationRow[]> {
    const uniqueIds = [...new Set(saleInvoiceItemBatchIds)].sort(
      (a, b) => a - b,
    );

    if (uniqueIds.length === 0) {
      return [];
    }

    return tx.$queryRaw<LockedSaleAllocationRow[]>(Prisma.sql`
      SELECT
        sib."sale_invoice_item_batch_id" AS "saleInvoiceItemBatchId",
        sib."sale_invoice_item_id" AS "saleInvoiceItemId",
        sib."batch_id" AS "batchId",
        sib."base_quantity" AS "allocatedBaseQuantity",
        sii."pharmacy_drug_id" AS "pharmacyDrugId",
        sii."base_unit_price" AS "baseUnitPrice",
        sii."unit_type" AS "saleUnitType",
        sii."unit_factor_to_base" AS "saleUnitFactorToBase"
      FROM "sale_invoice_item_batches" sib
      INNER JOIN "sale_invoice_items" sii
        ON sii."sale_invoice_item_id" = sib."sale_invoice_item_id"
      INNER JOIN "sale_invoices" si
        ON si."sale_invoice_id" = sii."sale_invoice_id"
      INNER JOIN "pharmacy_invoices" pi
        ON pi."pharmacy_invoice_id" = si."pharmacy_invoice_id"
      WHERE
        pi."pharmacy_id" = ${pharmacyId}
        AND pi."invoice_type" = 'SALE'
        AND si."sale_invoice_id" = ${referenceSaleInvoiceId}
        AND sib."sale_invoice_item_batch_id" IN (${Prisma.join(uniqueIds)})
      ORDER BY
        sib."sale_invoice_item_batch_id" ASC
      FOR UPDATE OF sib
    `);
  }

  private resolveReturnUnitFactorToBase(
    returnedUnitType: UnitType,
    allocation: LockedSaleAllocationRow,
  ): number {
    const saleUnitFactorToBase = Number(allocation.saleUnitFactorToBase);

    if (!saleUnitFactorToBase || saleUnitFactorToBase <= 0) {
      throw new BadRequestException(
        `Invalid sale unit factor for saleInvoiceItemBatchId ${allocation.saleInvoiceItemBatchId}`,
      );
    }

    switch (returnedUnitType) {
      case UnitType.STRIP:
        return 1;

      case UnitType.BOX:
        if (allocation.saleUnitType !== UnitType.BOX) {
          throw new BadRequestException(
            `Cannot return saleInvoiceItemBatchId ${allocation.saleInvoiceItemBatchId} as BOX because the original sale unit was ${allocation.saleUnitType}`,
          );
        }

        return saleUnitFactorToBase;

      case UnitType.TABLET:
        throw new BadRequestException('TABLET return is not supported yet');

      default:
        throw new BadRequestException(
          `Unsupported unitType ${returnedUnitType}`,
        );
    }
  }

  private assertAllRequestedAllocationsExist(
    requestedItems: Array<{ saleInvoiceItemBatchId: number }>,
    lockedAllocations: LockedSaleAllocationRow[],
  ): void {
    const lockedIds = new Set(
      lockedAllocations.map((item) => item.saleInvoiceItemBatchId),
    );

    const requestedIds = [
      ...new Set(requestedItems.map((item) => item.saleInvoiceItemBatchId)),
    ];

    const invalidIds = requestedIds.filter((id) => !lockedIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid saleInvoiceItemBatchId values for this sale invoice: ${invalidIds.join(
          ', ',
        )}`,
      );
    }
  }
  //   private assertAllRequestedAllocationsExist(
  //     computedItems: ComputedReturnItem[],
  //     lockedAllocations: LockedSaleAllocationRow[],
  //   ): void {
  //     const lockedIds = new Set(
  //       lockedAllocations.map((item) => item.saleInvoiceItemBatchId),
  //     );

  //     const requestedIds = [
  //       ...new Set(computedItems.map((item) => item.saleInvoiceItemBatchId)),
  //     ];

  //     const invalidIds = requestedIds.filter((id) => !lockedIds.has(id));

  //     if (invalidIds.length > 0) {
  //       throw new BadRequestException(
  //         `Invalid saleInvoiceItemBatchId values for this sale invoice: ${invalidIds.join(
  //           ', ',
  //         )}`,
  //       );
  //     }
  //   }

  private async assertReturnQuantitiesAreValid(
    tx: Prisma.TransactionClient,
    computedItems: ComputedReturnItem[],
    lockedAllocations: LockedSaleAllocationRow[],
  ): Promise<void> {
    const requestedByAllocation =
      this.sumRequestedReturnQuantitiesByAllocation(computedItems);

    const allocationIds = [...requestedByAllocation.keys()];

    const previousReturns = await tx.returnInvoiceItem.groupBy({
      by: ['saleInvoiceItemBatchId'],
      where: {
        saleInvoiceItemBatchId: {
          in: allocationIds,
        },
      },
      _sum: {
        baseQuantity: true,
      },
    });

    const previousReturnedByAllocation = new Map<number, number>();

    for (const previous of previousReturns) {
      previousReturnedByAllocation.set(
        previous.saleInvoiceItemBatchId,
        previous._sum.baseQuantity ?? 0,
      );
    }

    for (const allocation of lockedAllocations) {
      const requestedQuantity =
        requestedByAllocation.get(allocation.saleInvoiceItemBatchId) ?? 0;

      const previousReturned =
        previousReturnedByAllocation.get(allocation.saleInvoiceItemBatchId) ??
        0;

      if (
        previousReturned + requestedQuantity >
        allocation.allocatedBaseQuantity
      ) {
        throw new BadRequestException(
          `Returned quantity exceeds sold quantity for saleInvoiceItemBatchId ${allocation.saleInvoiceItemBatchId}`,
        );
      }
    }
  }

  private sumRequestedReturnQuantitiesByAllocation(
    computedItems: ComputedReturnItem[],
  ): Map<number, number> {
    const result = new Map<number, number>();

    for (const item of computedItems) {
      result.set(
        item.saleInvoiceItemBatchId,
        (result.get(item.saleInvoiceItemBatchId) ?? 0) + item.baseQuantity,
      );
    }

    return result;
  }

  private buildBatchRestockDecrements(
    items: Array<
      ComputedReturnItem & {
        batchId: number;
      }
    >,
  ): Map<number, number> {
    const result = new Map<number, number>();

    for (const item of items) {
      if (!item.restockToInventory) {
        continue;
      }

      result.set(
        item.batchId,
        (result.get(item.batchId) ?? 0) + item.baseQuantity,
      );
    }

    return result;
  }

  private async decrementBatchSoldQuantities(
    tx: Prisma.TransactionClient,
    decrements: Map<number, number>,
  ): Promise<void> {
    for (const [batchId, decrement] of decrements) {
      const updatedRows = await tx.$queryRaw<{ batchId: number }[]>(Prisma.sql`
        UPDATE "batches"
        SET
          "sold_quantity" = "sold_quantity" - ${decrement},
          "status" = CASE
            WHEN "status" = 'DEPLETED'::"BatchStatus"
              AND ("sold_quantity" - ${decrement}) < "initial_quantity"
              THEN 'ACTIVE'::"BatchStatus"
            ELSE "status"
          END
        WHERE
          "batch_id" = ${batchId}
          AND "sold_quantity" >= ${decrement}
        RETURNING "batch_id" AS "batchId"
      `);

      if (updatedRows.length !== 1) {
        throw new BadRequestException(
          `Cannot restock quantity for batchId ${batchId}`,
        );
      }
    }
  }

  private findReturnInvoiceWithDetails(
    tx: Prisma.TransactionClient,
    returnInvoiceId: number,
  ) {
    return tx.returnInvoice.findUnique({
      where: {
        returnInvoiceId,
      },
      include: {
        pharmacyInvoice: {
          include: {
            patient: true,
          },
        },
        referenceSaleInvoice: {
          include: {
            pharmacyInvoice: true,
          },
        },
        items: {
          include: {
            pharmacyDrug: true,
            saleInvoiceItemBatch: {
              include: {
                batch: true,
                saleInvoiceItem: true,
              },
            },
          },
        },
      },
    });
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
