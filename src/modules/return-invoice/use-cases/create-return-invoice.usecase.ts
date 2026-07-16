// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import {
//   PharmacyInvoiceStatus,
//   PharmacyInvoiceType,
//   Prisma,
//   UnitType,
// } from '../../../generated/prisma/client';
// import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
// import { CreateReturnInvoiceDto } from '../dto/create-return-invoice.dto';

// type ComputedReturnItem = {
//   saleInvoiceItemBatchId: number;
//   unitType: UnitType;
//   displayQuantity: number;
//   unitFactorToBase: number;
//   baseQuantity: number;
//   returnReason?: string;
//   restockToInventory: boolean;
// };

// type LockedSaleAllocationRow = {
//   saleInvoiceItemBatchId: number;
//   saleInvoiceItemId: number;
//   batchId: number;
//   allocatedBaseQuantity: number;
//   pharmacyDrugId: number;
//   // baseUnitPrice: Prisma.Decimal;

//   netTotalPrice: Prisma.Decimal;
//   saleBaseQuantity: number;

//   saleUnitType: UnitType;
//   saleUnitFactorToBase: number;
// };

// type PreviousSaleItemReturnTotals = {
//   returnedBaseQuantity: number;
//   refundedCents: number;
// };

// @Injectable()
// export class CreateReturnInvoiceUseCase {
//   constructor(private readonly unitOfWork: UnitOfWork) {}

//   async execute(pharmacyId: number, dto: CreateReturnInvoiceDto) {
//     this.validatePayload(dto);

//     // const computedItems = this.computeItems(dto);

//     return this.unitOfWork.executeSerializable(async (tx) => {
//       const existingReturnInvoice =
//         await this.findExistingReturnInvoiceByIdempotencyKey(
//           tx,
//           pharmacyId,
//           dto.idempotencyKey,
//         );

//       if (existingReturnInvoice) {
//         return existingReturnInvoice;
//       }

//       const referenceSaleInvoice = await this.findReferenceSaleInvoiceOrThrow(
//         tx,
//         pharmacyId,
//         dto.referenceSaleInvoiceId,
//       );

//       const lockedAllocations = await this.lockSaleAllocationsForReturn(
//         tx,
//         pharmacyId,
//         dto.referenceSaleInvoiceId,
//         dto.items.map((item) => item.saleInvoiceItemBatchId),
//       );

//       this.assertAllRequestedAllocationsExist(dto.items, lockedAllocations);

//       const computedItems = this.computeItems(dto, lockedAllocations);

//       await this.assertReturnQuantitiesAreValid(
//         tx,
//         computedItems,
//         lockedAllocations,
//       );

//       const previousReturnTotalsBySaleItem =
//         await this.getPreviousReturnTotalsBySaleItem(tx, lockedAllocations);

//       const computedItemsWithPrices = this.computeReturnPrices(
//         computedItems,
//         lockedAllocations,
//         previousReturnTotalsBySaleItem,
//       );

//       ///////////////////
//       // const allocationById = new Map(
//       //   lockedAllocations.map((allocation) => [
//       //     allocation.saleInvoiceItemBatchId,
//       //     allocation,
//       //   ]),
//       // );

//       // const computedItemsWithPrices = computedItems.map((item) => {
//       //   const allocation = allocationById.get(item.saleInvoiceItemBatchId);

//       //   if (!allocation) {
//       //     throw new BadRequestException(
//       //       `Invalid saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
//       //     );
//       //   }

//       //   // const baseUnitPrice = Number(allocation.baseUnitPrice);

//       //   // const unitPrice = this.roundMoney(
//       //   //   baseUnitPrice * item.unitFactorToBase,
//       //   // );

//       //   // const totalPrice = this.roundMoney(baseUnitPrice * item.baseQuantity);

//       //   const netTotalPrice = Number(allocation.netTotalPrice);

//       //   const saleBaseQuantity = Number(allocation.saleBaseQuantity);

//       //   if (saleBaseQuantity <= 0) {
//       //     throw new BadRequestException(
//       //       `Invalid sale base quantity for saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
//       //     );
//       //   }

//       //   // Actual base-unit price after invoice discount
//       //   const netBaseUnitPrice = netTotalPrice / saleBaseQuantity;

//       //   const unitPrice = this.roundMoney(
//       //     netBaseUnitPrice * item.unitFactorToBase,
//       //   );

//       //   const totalPrice = this.roundMoney(
//       //     netBaseUnitPrice * item.baseQuantity,
//       //   );

//       //   return {
//       //     ...item,
//       //     pharmacyDrugId: allocation.pharmacyDrugId,
//       //     batchId: allocation.batchId,
//       //     unitPrice,
//       //     totalPrice,
//       //   };
//       // });

//       const subtotalRefund = this.roundMoney(
//         computedItemsWithPrices.reduce((sum, item) => sum + item.totalPrice, 0),
//       );

//       const pharmacyInvoice = await tx.pharmacyInvoice.create({
//         data: {
//           pharmacyId,
//           patientId:
//             referenceSaleInvoice.pharmacyInvoice.patientId ?? undefined,
//           invoiceType: PharmacyInvoiceType.RETURN,
//           invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
//           status: PharmacyInvoiceStatus.POSTED,
//           notes: dto.notes?.trim() || undefined,
//           idempotencyKey: dto.idempotencyKey ?? undefined,
//         },
//       });

//       const returnInvoice = await tx.returnInvoice.create({
//         data: {
//           pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
//           referenceSaleInvoiceId: dto.referenceSaleInvoiceId,
//           subtotalRefund,
//         },
//       });

//       for (const item of computedItemsWithPrices) {
//         await tx.returnInvoiceItem.create({
//           data: {
//             returnInvoiceId: returnInvoice.returnInvoiceId,

//             pharmacyDrugId: item.pharmacyDrugId,

//             saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,

//             unitType: item.unitType,
//             baseQuantity: item.baseQuantity,
//             unitFactorToBase: item.unitFactorToBase,

//             unitPrice: item.unitPrice,
//             totalPrice: item.totalPrice,

//             returnReason: item.returnReason as any,
//             restockToInventory: item.restockToInventory,
//           },
//         });
//       }

//       const batchRestockDecrements = this.buildBatchRestockDecrements(
//         computedItemsWithPrices,
//       );

//       await this.decrementBatchSoldQuantities(tx, batchRestockDecrements);

//       return this.findReturnInvoiceWithDetails(
//         tx,
//         returnInvoice.returnInvoiceId,
//       );
//     });
//   }

//   private async getPreviousReturnTotalsBySaleItem(
//     tx: Prisma.TransactionClient,
//     lockedAllocations: LockedSaleAllocationRow[],
//   ): Promise<Map<number, PreviousSaleItemReturnTotals>> {
//     const saleInvoiceItemIds = [
//       ...new Set(
//         lockedAllocations.map((allocation) => allocation.saleInvoiceItemId),
//       ),
//     ];

//     if (saleInvoiceItemIds.length === 0) {
//       return new Map();
//     }

//     const previousReturnItems = await tx.returnInvoiceItem.findMany({
//       where: {
//         saleInvoiceItemBatch: {
//           saleInvoiceItemId: {
//             in: saleInvoiceItemIds,
//           },
//         },
//       },
//       select: {
//         baseQuantity: true,
//         totalPrice: true,

//         saleInvoiceItemBatch: {
//           select: {
//             saleInvoiceItemId: true,
//           },
//         },
//       },
//     });

//     const result = new Map<number, PreviousSaleItemReturnTotals>();

//     for (const returnItem of previousReturnItems) {
//       const saleInvoiceItemId =
//         returnItem.saleInvoiceItemBatch.saleInvoiceItemId;

//       const current = result.get(saleInvoiceItemId) ?? {
//         returnedBaseQuantity: 0,
//         refundedCents: 0,
//       };

//       current.returnedBaseQuantity += returnItem.baseQuantity;

//       current.refundedCents += this.toCents(Number(returnItem.totalPrice));

//       result.set(saleInvoiceItemId, current);
//     }

//     return result;
//   }

//   private computeReturnPrices(
//     items: ComputedReturnItem[],
//     lockedAllocations: LockedSaleAllocationRow[],
//     previousReturnTotalsBySaleItem: Map<number, PreviousSaleItemReturnTotals>,
//   ) {
//     const allocationById = new Map(
//       lockedAllocations.map((allocation) => [
//         allocation.saleInvoiceItemBatchId,
//         allocation,
//       ]),
//     );

//     const itemsBySaleItemId = new Map<
//       number,
//       Array<{
//         originalIndex: number;
//         item: ComputedReturnItem;
//         allocation: LockedSaleAllocationRow;
//       }>
//     >();

//     items.forEach((item, originalIndex) => {
//       const allocation = allocationById.get(item.saleInvoiceItemBatchId);

//       if (!allocation) {
//         throw new BadRequestException(
//           `Invalid saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
//         );
//       }

//       const group = itemsBySaleItemId.get(allocation.saleInvoiceItemId) ?? [];

//       group.push({
//         originalIndex,
//         item,
//         allocation,
//       });

//       itemsBySaleItemId.set(allocation.saleInvoiceItemId, group);
//     });

//     const result = new Array<
//       ComputedReturnItem & {
//         pharmacyDrugId: number;
//         batchId: number;
//         unitPrice: number;
//         totalPrice: number;
//       }
//     >(items.length);

//     for (const [saleInvoiceItemId, group] of itemsBySaleItemId) {
//       const saleBaseQuantity = Number(group[0].allocation.saleBaseQuantity);

//       const netTotalCents = this.toCents(
//         Number(group[0].allocation.netTotalPrice),
//       );

//       if (saleBaseQuantity <= 0) {
//         throw new BadRequestException(
//           `Invalid sale base quantity for saleInvoiceItemId ${saleInvoiceItemId}`,
//         );
//       }

//       const previousTotals = previousReturnTotalsBySaleItem.get(
//         saleInvoiceItemId,
//       ) ?? {
//         returnedBaseQuantity: 0,
//         refundedCents: 0,
//       };

//       if (previousTotals.returnedBaseQuantity > saleBaseQuantity) {
//         throw new BadRequestException(
//           `Previous returned quantity exceeds sold quantity for saleInvoiceItemId ${saleInvoiceItemId}`,
//         );
//       }

//       if (previousTotals.refundedCents > netTotalCents) {
//         throw new BadRequestException(
//           `Previous refunded amount exceeds net sale total for saleInvoiceItemId ${saleInvoiceItemId}`,
//         );
//       }

//       const currentRequestedBaseQuantity = group.reduce(
//         (sum, entry) => sum + entry.item.baseQuantity,
//         0,
//       );

//       const cumulativeReturnedBaseQuantity =
//         previousTotals.returnedBaseQuantity + currentRequestedBaseQuantity;

//       if (cumulativeReturnedBaseQuantity > saleBaseQuantity) {
//         throw new BadRequestException(
//           `Returned quantity exceeds sold quantity for saleInvoiceItemId ${saleInvoiceItemId}`,
//         );
//       }

//       const targetCumulativeRefundCents =
//         cumulativeReturnedBaseQuantity === saleBaseQuantity
//           ? netTotalCents
//           : this.calculateProportionalCents(
//               netTotalCents,
//               cumulativeReturnedBaseQuantity,
//               saleBaseQuantity,
//             );

//       const currentRefundCents =
//         targetCumulativeRefundCents - previousTotals.refundedCents;

//       if (currentRefundCents < 0) {
//         throw new BadRequestException(
//           `Previous refund totals are inconsistent for saleInvoiceItemId ${saleInvoiceItemId}`,
//         );
//       }

//       const remainingRefundCents = netTotalCents - previousTotals.refundedCents;

//       const safeCurrentRefundCents = Math.min(
//         currentRefundCents,
//         remainingRefundCents,
//       );

//       const refundCentsByItem = this.distributeCentsByWeight(
//         group.map((entry) => entry.item.baseQuantity),
//         safeCurrentRefundCents,
//       );

//       group.forEach((entry, groupIndex) => {
//         const totalPrice = this.fromCents(refundCentsByItem[groupIndex]);

//         const unitPrice = this.roundMoney(
//           totalPrice / entry.item.displayQuantity,
//         );

//         result[entry.originalIndex] = {
//           ...entry.item,

//           pharmacyDrugId: entry.allocation.pharmacyDrugId,

//           batchId: entry.allocation.batchId,

//           unitPrice,
//           totalPrice,
//         };
//       });
//     }

//     return result;
//   }

//   private calculateProportionalCents(
//     totalCents: number,
//     returnedBaseQuantity: number,
//     totalBaseQuantity: number,
//   ): number {
//     return Number(
//       (BigInt(totalCents) * BigInt(returnedBaseQuantity)) /
//         BigInt(totalBaseQuantity),
//     );
//   }

//   private distributeCentsByWeight(
//     weights: number[],
//     totalCents: number,
//   ): number[] {
//     if (totalCents === 0) {
//       return weights.map(() => 0);
//     }

//     const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

//     if (totalWeight <= 0) {
//       throw new BadRequestException(
//         'Return item weight must be greater than 0',
//       );
//     }

//     const totalWeightBigInt = BigInt(totalWeight);

//     const allocations = weights.map((weight, index) => {
//       const numerator = BigInt(totalCents) * BigInt(weight);

//       return {
//         index,

//         cents: Number(numerator / totalWeightBigInt),

//         remainder: numerator % totalWeightBigInt,
//       };
//     });

//     let remainingCents =
//       totalCents -
//       allocations.reduce((sum, allocation) => sum + allocation.cents, 0);

//     const allocationOrder = [...allocations].sort((a, b) => {
//       if (a.remainder === b.remainder) {
//         return a.index - b.index;
//       }

//       return a.remainder > b.remainder ? -1 : 1;
//     });

//     for (
//       let index = 0;
//       index < allocationOrder.length && remainingCents > 0;
//       index++
//     ) {
//       allocationOrder[index].cents += 1;
//       remainingCents -= 1;
//     }

//     return allocations.map((allocation) => allocation.cents);
//   }

//   private toCents(value: number): number {
//     return Math.round(value * 100);
//   }

//   private fromCents(value: number): number {
//     return value / 100;
//   }
//   private validatePayload(dto: CreateReturnInvoiceDto): void {
//     if (!Array.isArray(dto.items) || dto.items.length === 0) {
//       throw new BadRequestException('items must be a non-empty array');
//     }

//     const itemKeys = new Set<string>();

//     for (const item of dto.items) {
//       const key = `${item.saleInvoiceItemBatchId}:${item.unitType}`;

//       if (itemKeys.has(key)) {
//         throw new BadRequestException(
//           `Duplicate return item is not allowed for saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId} and unitType ${item.unitType}`,
//         );
//       }

//       itemKeys.add(key);

//       if (item.displayQuantity <= 0) {
//         throw new BadRequestException('displayQuantity must be greater than 0');
//       }
//     }
//   }

//   //   private computeItems(dto: CreateReturnInvoiceDto): ComputedReturnItem[] {
//   //     return dto.items.map((item) => ({
//   //       saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,
//   //       unitType: item.unitType,
//   //       displayQuantity: item.displayQuantity,
//   //       unitFactorToBase: item.unitFactorToBase,
//   //       baseQuantity: item.displayQuantity * item.unitFactorToBase,
//   //       returnReason: item.returnReason,
//   //       restockToInventory: item.restockToInventory ?? true,
//   //     }));
//   //   }

//   private computeItems(
//     dto: CreateReturnInvoiceDto,
//     lockedAllocations: LockedSaleAllocationRow[],
//   ): ComputedReturnItem[] {
//     const allocationById = new Map(
//       lockedAllocations.map((allocation) => [
//         allocation.saleInvoiceItemBatchId,
//         allocation,
//       ]),
//     );

//     return dto.items.map((item) => {
//       const allocation = allocationById.get(item.saleInvoiceItemBatchId);

//       if (!allocation) {
//         throw new BadRequestException(
//           `Invalid saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
//         );
//       }

//       const unitFactorToBase = this.resolveReturnUnitFactorToBase(
//         item.unitType,
//         allocation,
//       );

//       const displayQuantity = Number(item.displayQuantity);

//       const baseQuantity = displayQuantity * unitFactorToBase;

//       return {
//         saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,
//         unitType: item.unitType,
//         displayQuantity,
//         unitFactorToBase,
//         baseQuantity,
//         returnReason: item.returnReason,
//         restockToInventory: item.restockToInventory ?? true,
//       };
//     });
//   }

//   private async findExistingReturnInvoiceByIdempotencyKey(
//     tx: Prisma.TransactionClient,
//     pharmacyId: number,
//     idempotencyKey?: string,
//   ) {
//     if (!idempotencyKey) {
//       return null;
//     }

//     const existingPharmacyInvoice = await tx.pharmacyInvoice.findFirst({
//       where: {
//         pharmacyId,
//         invoiceType: PharmacyInvoiceType.RETURN,
//         idempotencyKey,
//       },
//       include: {
//         returnInvoice: true,
//       },
//     });

//     if (!existingPharmacyInvoice?.returnInvoice) {
//       return null;
//     }

//     return this.findReturnInvoiceWithDetails(
//       tx,
//       existingPharmacyInvoice.returnInvoice.returnInvoiceId,
//     );
//   }

//   private async findReferenceSaleInvoiceOrThrow(
//     tx: Prisma.TransactionClient,
//     pharmacyId: number,
//     saleInvoiceId: number,
//   ) {
//     const saleInvoice = await tx.saleInvoice.findFirst({
//       where: {
//         saleInvoiceId,
//         pharmacyInvoice: {
//           pharmacyId,
//           invoiceType: PharmacyInvoiceType.SALE,
//           status: PharmacyInvoiceStatus.POSTED,
//         },
//       },
//       include: {
//         pharmacyInvoice: true,
//       },
//     });

//     if (!saleInvoice) {
//       throw new NotFoundException('Reference sale invoice not found');
//     }

//     return saleInvoice;
//   }

//   private async lockSaleAllocationsForReturn(
//     tx: Prisma.TransactionClient,
//     pharmacyId: number,
//     referenceSaleInvoiceId: number,
//     saleInvoiceItemBatchIds: number[],
//   ): Promise<LockedSaleAllocationRow[]> {
//     const uniqueIds = [...new Set(saleInvoiceItemBatchIds)].sort(
//       (a, b) => a - b,
//     );

//     if (uniqueIds.length === 0) {
//       return [];
//     }

//     return tx.$queryRaw<LockedSaleAllocationRow[]>(Prisma.sql`
//       -- SELECT
//         -- sib."sale_invoice_item_batch_id" AS "saleInvoiceItemBatchId",
//         -- sib."sale_invoice_item_id" AS "saleInvoiceItemId",
//         -- sib."batch_id" AS "batchId",
//         -- sib."base_quantity" AS "allocatedBaseQuantity",
//         -- sii."pharmacy_drug_id" AS "pharmacyDrugId",
//         -- sii."base_unit_price" AS "baseUnitPrice",
//         -- sii."unit_type" AS "saleUnitType",
//         -- sii."unit_factor_to_base" AS "saleUnitFactorToBase"
//       SELECT
//         sib."sale_invoice_item_batch_id" AS "saleInvoiceItemBatchId",
//         sib."sale_invoice_item_id" AS "saleInvoiceItemId",
//         sib."batch_id" AS "batchId",
//         sib."base_quantity" AS "allocatedBaseQuantity",

//         sii."pharmacy_drug_id" AS "pharmacyDrugId",

//         sii."net_total_price" AS "netTotalPrice",
//         sii."base_quantity" AS "saleBaseQuantity",

//         sii."unit_type" AS "saleUnitType",
//         sii."unit_factor_to_base" AS "saleUnitFactorToBase"
//       FROM "sale_invoice_item_batches" sib
//       INNER JOIN "sale_invoice_items" sii
//         ON sii."sale_invoice_item_id" = sib."sale_invoice_item_id"
//       INNER JOIN "sale_invoices" si
//         ON si."sale_invoice_id" = sii."sale_invoice_id"
//       INNER JOIN "pharmacy_invoices" pi
//         ON pi."pharmacy_invoice_id" = si."pharmacy_invoice_id"
//       WHERE
//         pi."pharmacy_id" = ${pharmacyId}
//         AND pi."invoice_type" = 'SALE'
//         AND si."sale_invoice_id" = ${referenceSaleInvoiceId}
//         AND sib."sale_invoice_item_batch_id" IN (${Prisma.join(uniqueIds)})
//       ORDER BY
//         sib."sale_invoice_item_batch_id" ASC
//       -- FOR UPDATE OF sib
//       FOR UPDATE OF sii, sib
//     `);
//   }

//   private resolveReturnUnitFactorToBase(
//     returnedUnitType: UnitType,
//     allocation: LockedSaleAllocationRow,
//   ): number {
//     const saleUnitFactorToBase = Number(allocation.saleUnitFactorToBase);

//     if (!saleUnitFactorToBase || saleUnitFactorToBase <= 0) {
//       throw new BadRequestException(
//         `Invalid sale unit factor for saleInvoiceItemBatchId ${allocation.saleInvoiceItemBatchId}`,
//       );
//     }

//     switch (returnedUnitType) {
//       case UnitType.STRIP:
//         return 1;

//       case UnitType.BOX:
//         if (allocation.saleUnitType !== UnitType.BOX) {
//           throw new BadRequestException(
//             `Cannot return saleInvoiceItemBatchId ${allocation.saleInvoiceItemBatchId} as BOX because the original sale unit was ${allocation.saleUnitType}`,
//           );
//         }

//         return saleUnitFactorToBase;

//       case UnitType.TABLET:
//         throw new BadRequestException('TABLET return is not supported yet');

//       default:
//         throw new BadRequestException(
//           `Unsupported unitType ${returnedUnitType}`,
//         );
//     }
//   }

//   private assertAllRequestedAllocationsExist(
//     requestedItems: Array<{ saleInvoiceItemBatchId: number }>,
//     lockedAllocations: LockedSaleAllocationRow[],
//   ): void {
//     const lockedIds = new Set(
//       lockedAllocations.map((item) => item.saleInvoiceItemBatchId),
//     );

//     const requestedIds = [
//       ...new Set(requestedItems.map((item) => item.saleInvoiceItemBatchId)),
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
//   //   private assertAllRequestedAllocationsExist(
//   //     computedItems: ComputedReturnItem[],
//   //     lockedAllocations: LockedSaleAllocationRow[],
//   //   ): void {
//   //     const lockedIds = new Set(
//   //       lockedAllocations.map((item) => item.saleInvoiceItemBatchId),
//   //     );

//   //     const requestedIds = [
//   //       ...new Set(computedItems.map((item) => item.saleInvoiceItemBatchId)),
//   //     ];

//   //     const invalidIds = requestedIds.filter((id) => !lockedIds.has(id));

//   //     if (invalidIds.length > 0) {
//   //       throw new BadRequestException(
//   //         `Invalid saleInvoiceItemBatchId values for this sale invoice: ${invalidIds.join(
//   //           ', ',
//   //         )}`,
//   //       );
//   //     }
//   //   }

//   private async assertReturnQuantitiesAreValid(
//     tx: Prisma.TransactionClient,
//     computedItems: ComputedReturnItem[],
//     lockedAllocations: LockedSaleAllocationRow[],
//   ): Promise<void> {
//     const requestedByAllocation =
//       this.sumRequestedReturnQuantitiesByAllocation(computedItems);

//     const allocationIds = [...requestedByAllocation.keys()];

//     const previousReturns = await tx.returnInvoiceItem.groupBy({
//       by: ['saleInvoiceItemBatchId'],
//       where: {
//         saleInvoiceItemBatchId: {
//           in: allocationIds,
//         },
//       },
//       _sum: {
//         baseQuantity: true,
//       },
//     });

//     const previousReturnedByAllocation = new Map<number, number>();

//     for (const previous of previousReturns) {
//       previousReturnedByAllocation.set(
//         previous.saleInvoiceItemBatchId,
//         previous._sum.baseQuantity ?? 0,
//       );
//     }

//     for (const allocation of lockedAllocations) {
//       const requestedQuantity =
//         requestedByAllocation.get(allocation.saleInvoiceItemBatchId) ?? 0;

//       const previousReturned =
//         previousReturnedByAllocation.get(allocation.saleInvoiceItemBatchId) ??
//         0;

//       if (
//         previousReturned + requestedQuantity >
//         allocation.allocatedBaseQuantity
//       ) {
//         throw new BadRequestException(
//           `Returned quantity exceeds sold quantity for saleInvoiceItemBatchId ${allocation.saleInvoiceItemBatchId}`,
//         );
//       }
//     }
//   }

//   private sumRequestedReturnQuantitiesByAllocation(
//     computedItems: ComputedReturnItem[],
//   ): Map<number, number> {
//     const result = new Map<number, number>();

//     for (const item of computedItems) {
//       result.set(
//         item.saleInvoiceItemBatchId,
//         (result.get(item.saleInvoiceItemBatchId) ?? 0) + item.baseQuantity,
//       );
//     }

//     return result;
//   }

//   private buildBatchRestockDecrements(
//     items: Array<
//       ComputedReturnItem & {
//         batchId: number;
//       }
//     >,
//   ): Map<number, number> {
//     const result = new Map<number, number>();

//     for (const item of items) {
//       if (!item.restockToInventory) {
//         continue;
//       }

//       result.set(
//         item.batchId,
//         (result.get(item.batchId) ?? 0) + item.baseQuantity,
//       );
//     }

//     return result;
//   }

//   private async decrementBatchSoldQuantities(
//     tx: Prisma.TransactionClient,
//     decrements: Map<number, number>,
//   ): Promise<void> {
//     for (const [batchId, decrement] of decrements) {
//       const updatedRows = await tx.$queryRaw<{ batchId: number }[]>(Prisma.sql`
//         UPDATE "batches"
//         SET
//           "sold_quantity" = "sold_quantity" - ${decrement},
//           "status" = CASE
//             WHEN "status" = 'DEPLETED'::"BatchStatus"
//               AND ("sold_quantity" - ${decrement}) < "initial_quantity"
//               THEN 'ACTIVE'::"BatchStatus"
//             ELSE "status"
//           END
//         WHERE
//           "batch_id" = ${batchId}
//           AND "sold_quantity" >= ${decrement}
//         RETURNING "batch_id" AS "batchId"
//       `);

//       if (updatedRows.length !== 1) {
//         throw new BadRequestException(
//           `Cannot restock quantity for batchId ${batchId}`,
//         );
//       }
//     }
//   }

//   private findReturnInvoiceWithDetails(
//     tx: Prisma.TransactionClient,
//     returnInvoiceId: number,
//   ) {
//     return tx.returnInvoice.findUnique({
//       where: {
//         returnInvoiceId,
//       },
//       include: {
//         pharmacyInvoice: {
//           include: {
//             patient: true,
//           },
//         },
//         referenceSaleInvoice: {
//           include: {
//             pharmacyInvoice: true,
//           },
//         },
//         items: {
//           include: {
//             pharmacyDrug: true,
//             saleInvoiceItemBatch: {
//               include: {
//                 batch: true,
//                 saleInvoiceItem: true,
//               },
//             },
//           },
//         },
//       },
//     });
//   }

//   private roundMoney(value: number): number {
//     return Number(value.toFixed(2));
//   }
// }

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
  ReturnReason,
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
  returnReason?: ReturnReason;
  restockToInventory: boolean;
};

type LockedSaleAllocationRow = {
  saleInvoiceItemBatchId: number;
  saleInvoiceItemId: number;
  batchId: number;
  allocatedBaseQuantity: number;
  pharmacyDrugId: number;
  netTotalPrice: Prisma.Decimal;
  saleBaseQuantity: number;
  saleUnitType: UnitType;
  saleUnitFactorToBase: number;
};

type PreviousSaleItemReturnTotals = {
  returnedBaseQuantity: number;
  refundedCents: number;
};

type PricedReturnItem = ComputedReturnItem & {
  pharmacyDrugId: number;
  batchId: number;
  unitPrice: number;
  totalPrice: number;
};

type ReturnPricingGroupEntry = {
  originalIndex: number;
  item: ComputedReturnItem;
  allocation: LockedSaleAllocationRow;
};

@Injectable()
export class CreateReturnInvoiceUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  /**
   * Creates a return invoice inside a SERIALIZABLE transaction.
   * The flow validates the request, locks the original sale allocations,
   * checks returned quantities, calculates the exact refund in cents,
   * creates the return records, and restores sellable stock when required.
   */
  async execute(pharmacyId: number, dto: CreateReturnInvoiceDto) {
    this.validatePayload(dto);

    const idempotencyKey = dto.idempotencyKey?.trim() || undefined;
    const notes = dto.notes?.trim() || undefined;

    return this.unitOfWork.executeSerializable(async (tx) => {
      const existingReturnInvoice =
        await this.findExistingReturnInvoiceByIdempotencyKey(
          tx,
          pharmacyId,
          idempotencyKey,
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

      const previousReturnTotalsBySaleItem =
        await this.getPreviousReturnTotalsBySaleItem(tx, lockedAllocations);

      const pricedItems = this.computeReturnPrices(
        computedItems,
        lockedAllocations,
        previousReturnTotalsBySaleItem,
      );

      const subtotalRefund = this.fromCents(
        pricedItems.reduce(
          (sum, item) => sum + this.toCents(item.totalPrice),
          0,
        ),
      );

      const pharmacyInvoice = await tx.pharmacyInvoice.create({
        data: {
          pharmacyId,
          patientId:
            referenceSaleInvoice.pharmacyInvoice.patientId ?? undefined,
          invoiceType: PharmacyInvoiceType.RETURN,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          status: PharmacyInvoiceStatus.POSTED,
          notes,
          idempotencyKey,
        },
      });

      const returnInvoice = await tx.returnInvoice.create({
        data: {
          pharmacyInvoiceId: pharmacyInvoice.pharmacyInvoiceId,
          referenceSaleInvoiceId: dto.referenceSaleInvoiceId,
          subtotalRefund,
        },
      });

      for (const item of pricedItems) {
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
            returnReason: item.returnReason,
            restockToInventory: item.restockToInventory,
          },
        });
      }

      const batchRestockDecrements =
        this.buildBatchRestockDecrements(pricedItems);

      await this.decrementBatchSoldQuantities(tx, batchRestockDecrements);

      return this.findReturnInvoiceWithDetails(
        tx,
        returnInvoice.returnInvoiceId,
      );
    });
  }

  /**
   * Validates business rules that are easier to check at the use-case level.
   * It rejects empty requests, duplicate allocation/unit pairs, and invalid quantities.
   */
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

      if (
        !Number.isInteger(item.displayQuantity) ||
        item.displayQuantity <= 0
      ) {
        throw new BadRequestException(
          'displayQuantity must be a positive integer',
        );
      }
    }
  }

  /**
   * Finds a previously created return invoice with the same idempotency key.
   * Returning the existing invoice prevents the same request from being processed twice.
   */
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

  /**
   * Loads the original POSTED sale invoice for the current pharmacy.
   * A return cannot be created for another pharmacy or for a non-posted sale.
   */
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

  /**
   * Locks the requested sale-item batch allocations and their parent sale items.
   * Locking both rows protects quantity and refund calculations from concurrent returns.
   */
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
        sii."net_total_price" AS "netTotalPrice",
        sii."base_quantity" AS "saleBaseQuantity",
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
      FOR UPDATE OF sii, sib
    `);
  }

  /**
   * Ensures every requested saleInvoiceItemBatchId belongs to the referenced sale invoice.
   */
  private assertAllRequestedAllocationsExist(
    requestedItems: Array<{ saleInvoiceItemBatchId: number }>,
    lockedAllocations: LockedSaleAllocationRow[],
  ): void {
    const lockedIds = new Set(
      lockedAllocations.map((allocation) => allocation.saleInvoiceItemBatchId),
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

  /**
   * Converts the user-entered display quantity into the base inventory quantity.
   * The conversion factor is derived from the original sale, not from the frontend.
   */
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

  /**
   * Resolves how many base units are represented by the selected return unit.
   * STRIP uses one base unit, BOX reuses the original sale factor, and TABLET is rejected.
   */
  private resolveReturnUnitFactorToBase(
    returnedUnitType: UnitType,
    allocation: LockedSaleAllocationRow,
  ): number {
    const saleUnitFactorToBase = Number(allocation.saleUnitFactorToBase);

    if (!Number.isInteger(saleUnitFactorToBase) || saleUnitFactorToBase <= 0) {
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

  /**
   * Verifies that previous POSTED returns plus the current request do not exceed
   * the quantity originally allocated from each batch.
   */
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
        returnInvoice: {
          pharmacyInvoice: {
            status: PharmacyInvoiceStatus.POSTED,
          },
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

  /**
   * Groups the current requested base quantities by sale-item batch allocation.
   */
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

  /**
   * Calculates the quantity and money already refunded for each original sale item.
   * Only POSTED return invoices are counted.
   */
  private async getPreviousReturnTotalsBySaleItem(
    tx: Prisma.TransactionClient,
    lockedAllocations: LockedSaleAllocationRow[],
  ): Promise<Map<number, PreviousSaleItemReturnTotals>> {
    const saleInvoiceItemIds = [
      ...new Set(
        lockedAllocations.map((allocation) => allocation.saleInvoiceItemId),
      ),
    ];

    if (saleInvoiceItemIds.length === 0) {
      return new Map();
    }

    const previousReturnItems = await tx.returnInvoiceItem.findMany({
      where: {
        saleInvoiceItemBatch: {
          saleInvoiceItemId: {
            in: saleInvoiceItemIds,
          },
        },
        returnInvoice: {
          pharmacyInvoice: {
            status: PharmacyInvoiceStatus.POSTED,
          },
        },
      },
      select: {
        baseQuantity: true,
        totalPrice: true,
        saleInvoiceItemBatch: {
          select: {
            saleInvoiceItemId: true,
          },
        },
      },
    });

    const result = new Map<number, PreviousSaleItemReturnTotals>();

    for (const returnItem of previousReturnItems) {
      const saleInvoiceItemId =
        returnItem.saleInvoiceItemBatch.saleInvoiceItemId;

      const current = result.get(saleInvoiceItemId) ?? {
        returnedBaseQuantity: 0,
        refundedCents: 0,
      };

      current.returnedBaseQuantity += returnItem.baseQuantity;
      current.refundedCents += this.toCents(Number(returnItem.totalPrice));

      result.set(saleInvoiceItemId, current);
    }

    return result;
  }

  /**
   * Calculates the refund amount using cumulative cents per original sale item.
   * This prevents partial-return rounding from producing 0.01 over-refunds or under-refunds.
   */
  private computeReturnPrices(
    items: ComputedReturnItem[],
    lockedAllocations: LockedSaleAllocationRow[],
    previousReturnTotalsBySaleItem: Map<number, PreviousSaleItemReturnTotals>,
  ): PricedReturnItem[] {
    const allocationById = new Map(
      lockedAllocations.map((allocation) => [
        allocation.saleInvoiceItemBatchId,
        allocation,
      ]),
    );

    const itemsBySaleItemId = new Map<number, ReturnPricingGroupEntry[]>();

    items.forEach((item, originalIndex) => {
      const allocation = allocationById.get(item.saleInvoiceItemBatchId);

      if (!allocation) {
        throw new BadRequestException(
          `Invalid saleInvoiceItemBatchId ${item.saleInvoiceItemBatchId}`,
        );
      }

      const group = itemsBySaleItemId.get(allocation.saleInvoiceItemId) ?? [];

      group.push({
        originalIndex,
        item,
        allocation,
      });

      itemsBySaleItemId.set(allocation.saleInvoiceItemId, group);
    });

    const result = new Array<PricedReturnItem>(items.length);

    for (const [saleInvoiceItemId, group] of itemsBySaleItemId) {
      const saleBaseQuantity = Number(group[0].allocation.saleBaseQuantity);
      const netTotalCents = this.toCents(
        Number(group[0].allocation.netTotalPrice),
      );

      if (!Number.isInteger(saleBaseQuantity) || saleBaseQuantity <= 0) {
        throw new BadRequestException(
          `Invalid sale base quantity for saleInvoiceItemId ${saleInvoiceItemId}`,
        );
      }

      const previousTotals = previousReturnTotalsBySaleItem.get(
        saleInvoiceItemId,
      ) ?? {
        returnedBaseQuantity: 0,
        refundedCents: 0,
      };

      if (previousTotals.returnedBaseQuantity > saleBaseQuantity) {
        throw new BadRequestException(
          `Previous returned quantity exceeds sold quantity for saleInvoiceItemId ${saleInvoiceItemId}`,
        );
      }

      if (previousTotals.refundedCents > netTotalCents) {
        throw new BadRequestException(
          `Previous refunded amount exceeds net sale total for saleInvoiceItemId ${saleInvoiceItemId}`,
        );
      }

      const currentRequestedBaseQuantity = group.reduce(
        (sum, entry) => sum + entry.item.baseQuantity,
        0,
      );

      const cumulativeReturnedBaseQuantity =
        previousTotals.returnedBaseQuantity + currentRequestedBaseQuantity;

      if (cumulativeReturnedBaseQuantity > saleBaseQuantity) {
        throw new BadRequestException(
          `Returned quantity exceeds sold quantity for saleInvoiceItemId ${saleInvoiceItemId}`,
        );
      }

      const targetCumulativeRefundCents =
        cumulativeReturnedBaseQuantity === saleBaseQuantity
          ? netTotalCents
          : this.calculateProportionalCents(
              netTotalCents,
              cumulativeReturnedBaseQuantity,
              saleBaseQuantity,
            );

      const currentRefundCents =
        targetCumulativeRefundCents - previousTotals.refundedCents;

      if (currentRefundCents < 0) {
        throw new BadRequestException(
          `Previous refund totals are inconsistent for saleInvoiceItemId ${saleInvoiceItemId}`,
        );
      }

      const refundCentsByItem = this.distributeCentsByWeight(
        group.map((entry) => entry.item.baseQuantity),
        currentRefundCents,
      );

      group.forEach((entry, groupIndex) => {
        const totalPrice = this.fromCents(refundCentsByItem[groupIndex]);
        const unitPrice = this.roundMoney(
          totalPrice / entry.item.displayQuantity,
        );

        result[entry.originalIndex] = {
          ...entry.item,
          pharmacyDrugId: entry.allocation.pharmacyDrugId,
          batchId: entry.allocation.batchId,
          unitPrice,
          totalPrice,
        };
      });
    }

    return result;
  }

  /**
   * Calculates a proportional cumulative refund using integer arithmetic.
   * BigInt avoids floating-point precision errors during multiplication and division.
   */
  private calculateProportionalCents(
    totalCents: number,
    returnedBaseQuantity: number,
    totalBaseQuantity: number,
  ): number {
    return Number(
      (BigInt(totalCents) * BigInt(returnedBaseQuantity)) /
        BigInt(totalBaseQuantity),
    );
  }

  /**
   * Distributes an exact number of cents across current return lines by base quantity.
   * Remaining cents are assigned by the largest-remainder method.
   */
  private distributeCentsByWeight(
    weights: number[],
    totalCents: number,
  ): number[] {
    if (totalCents === 0) {
      return weights.map(() => 0);
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
      throw new BadRequestException(
        'Return item weight must be greater than 0',
      );
    }

    const totalWeightBigInt = BigInt(totalWeight);

    const allocations = weights.map((weight, index) => {
      const numerator = BigInt(totalCents) * BigInt(weight);

      return {
        index,
        cents: Number(numerator / totalWeightBigInt),
        remainder: numerator % totalWeightBigInt,
      };
    });

    let remainingCents =
      totalCents -
      allocations.reduce((sum, allocation) => sum + allocation.cents, 0);

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
      allocationOrder[index].cents += 1;
      remainingCents -= 1;
    }

    return allocations.map((allocation) => allocation.cents);
  }

  /**
   * Aggregates how much sold quantity must be removed from each batch.
   * Items marked as non-restockable are intentionally skipped.
   */
  private buildBatchRestockDecrements(
    items: PricedReturnItem[],
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

  /**
   * Restores sellable stock by decreasing batch.soldQuantity.
   * The update is guarded against negative sold quantities and keeps expired batches EXPIRED.
   */
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
            WHEN "expiry_date" IS NOT NULL
              AND "expiry_date" < CURRENT_DATE
              THEN 'EXPIRED'::"BatchStatus"
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

  /**
   * Loads the created return invoice with the patient, original sale, items, batches,
   * and original sale-item snapshot required by the API response.
   */
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

  /**
   * Converts a decimal money value to integer cents.
   */
  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  /**
   * Converts integer cents back to a decimal money value.
   */
  private fromCents(value: number): number {
    return value / 100;
  }

  /**
   * Rounds a decimal money value to two fractional digits.
   */
  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
