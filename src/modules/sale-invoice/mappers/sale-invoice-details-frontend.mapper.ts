import type { SaleInvoiceDetailsFrontendRecord } from '../queries/sale-invoice-details-frontend.query';

export type CustomerRequestItemExecutionSnapshot = {
  customerRequestItemId: number;
  requestedQuantity: number;
  soldQuantity: number;
  appliedToRequestQuantity: number;
  extraSaleQuantity: number;
  fulfilledQuantityAfterInvoice: number;
  remainingQuantityAfterInvoice: number;
};

export type CustomerRequestExecutionBySaleItemId = ReadonlyMap<
  number,
  CustomerRequestItemExecutionSnapshot
>;

/**
 * Maps the candidate Prisma query into a compact frontend contract.
 *
 * This mapper is ready for review, but is not used by the current endpoint.
 */
export function mapSaleInvoiceDetailsFrontendResponse(
  saleInvoice: SaleInvoiceDetailsFrontendRecord,
  executionBySaleItemId: CustomerRequestExecutionBySaleItemId,
) {
  return {
    saleInvoiceId: saleInvoice.saleInvoiceId,
    pharmacyInvoiceId: saleInvoice.pharmacyInvoiceId,

    saleType: saleInvoice.saleType,
    paymentStatus: saleInvoice.paymentStatus,
    invoiceStatus: saleInvoice.pharmacyInvoice.status,
    invoiceDate: saleInvoice.pharmacyInvoice.invoiceDate,
    notes: saleInvoice.pharmacyInvoice.notes,

    subtotal: saleInvoice.subtotal.toString(),
    discount: saleInvoice.discount.toString(),
    totalAmount: saleInvoice.totalAmount.toString(),

    patient: saleInvoice.pharmacyInvoice.patient
      ? {
          patientId: saleInvoice.pharmacyInvoice.patient.patientId,
          fullName: saleInvoice.pharmacyInvoice.patient.fullName,
          phone: saleInvoice.pharmacyInvoice.patient.phone,
          nationalId: saleInvoice.pharmacyInvoice.patient.nationalId,
        }
      : null,

    customerRequest: saleInvoice.customerRequest
      ? {
          customerRequestId:
            saleInvoice.customerRequest.customerRequestId,
          customerName: saleInvoice.customerRequest.customerName,
          customerPhone: saleInvoice.customerRequest.customerPhone,
          status: saleInvoice.customerRequest.status,
          requestedAt: saleInvoice.customerRequest.requestedAt,
          completedAt: saleInvoice.customerRequest.completedAt,
          cancelledAt: saleInvoice.customerRequest.cancelledAt,
        }
      : null,

    items: saleInvoice.items.map((item) => {
      const tradeName =
        item.pharmacyDrug.drug.generalDrug?.tradeName ??
        item.pharmacyDrug.drug.privateDrug?.tradeName ??
        null;

      return {
        saleInvoiceItemId: item.saleInvoiceItemId,
        pharmacyDrugId: item.pharmacyDrugId,
        drugId: item.pharmacyDrug.drugId,
        tradeName,
        source: item.pharmacyDrug.drug.source,

        unitType: item.unitType,
        unitFactorToBase: item.unitFactorToBase,
        baseQuantity: item.baseQuantity,
        displayQuantity: toDisplayQuantity(
          item.baseQuantity,
          item.unitFactorToBase,
        ),

        baseUnitPrice: item.baseUnitPrice.toString(),
        extraPercentage: item.extraPercentage.toString(),
        finalUnitPrice: item.finalUnitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        discountAmount: item.discountAmount?.toString() ?? null,
        netTotalPrice: item.netTotalPrice?.toString() ?? null,

        customerRequestExecution:
          executionBySaleItemId.get(item.saleInvoiceItemId) ?? null,

        batchAllocations: item.batchAllocations.map((allocation) => ({
          saleInvoiceItemBatchId:
            allocation.saleInvoiceItemBatchId,
          batchId: allocation.batchId,
          baseQuantity: allocation.baseQuantity,
          displayQuantity: toDisplayQuantity(
            allocation.baseQuantity,
            item.unitFactorToBase,
          ),
          expiryDate: allocation.batch.expiryDate,
          receivedDate: allocation.batch.receivedDate,
          status: allocation.batch.status,
        })),
      };
    }),

    returns: saleInvoice.returns.map((returnInvoice) => ({
      returnInvoiceId: returnInvoice.returnInvoiceId,
      pharmacyInvoiceId: returnInvoice.pharmacyInvoiceId,
      invoiceDate: returnInvoice.pharmacyInvoice.invoiceDate,
      invoiceStatus: returnInvoice.pharmacyInvoice.status,
      subtotalRefund: returnInvoice.subtotalRefund.toString(),
      itemsCount: returnInvoice._count.items,
    })),
  };
}

function toDisplayQuantity(
  baseQuantity: number,
  unitFactorToBase: number,
): number | null {
  if (unitFactorToBase <= 0) {
    return null;
  }

  return baseQuantity / unitFactorToBase;
}
