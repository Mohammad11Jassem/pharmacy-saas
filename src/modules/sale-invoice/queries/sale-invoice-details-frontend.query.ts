import { Prisma } from '../../../generated/prisma/client';

/**
 * Candidate query for the future frontend-focused sale-invoice response.
 *
 * It is intentionally not used by the current endpoint yet. Keeping it in a
 * dedicated file lets us review the exact data contract with the frontend
 * before replacing the legacy response.
 */
export const saleInvoiceDetailsFrontendSelect = {
  saleInvoiceId: true,
  pharmacyInvoiceId: true,
  paymentStatus: true,
  saleType: true,
  subtotal: true,
  discount: true,
  totalAmount: true,

  pharmacyInvoice: {
    select: {
      invoiceDate: true,
      status: true,
      notes: true,
      patient: {
        select: {
          patientId: true,
          fullName: true,
          phone: true,
          nationalId: true,
        },
      },
    },
  },

  customerRequest: {
    select: {
      customerRequestId: true,
      customerName: true,
      customerPhone: true,
      status: true,
      requestedAt: true,
      completedAt: true,
      cancelledAt: true,
    },
  },

  items: {
    orderBy: {
      saleInvoiceItemId: 'asc',
    },
    select: {
      saleInvoiceItemId: true,
      pharmacyDrugId: true,
      customerRequestItemId: true,

      unitType: true,
      baseQuantity: true,
      unitFactorToBase: true,

      baseUnitPrice: true,
      extraPercentage: true,
      finalUnitPrice: true,
      totalPrice: true,
      discountAmount: true,
      netTotalPrice: true,

      customerRequestItem: {
        select: {
          customerRequestItemId: true,
          requestedQuantity: true,
        },
      },

      pharmacyDrug: {
        select: {
          drugId: true,
          drug: {
            select: {
              source: true,
              generalDrug: {
                select: {
                  tradeName: true,
                },
              },
              privateDrug: {
                select: {
                  tradeName: true,
                },
              },
            },
          },
        },
      },

      batchAllocations: {
        orderBy: [
          {
            batch: {
              expiryDate: 'asc',
            },
          },
          {
            batchId: 'asc',
          },
        ],
        select: {
          saleInvoiceItemBatchId: true,
          batchId: true,
          baseQuantity: true,
          batch: {
            select: {
              expiryDate: true,
              receivedDate: true,
              status: true,
            },
          },
        },
      },
    },
  },

  returns: {
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      returnInvoiceId: true,
      pharmacyInvoiceId: true,
      subtotalRefund: true,
      pharmacyInvoice: {
        select: {
          invoiceDate: true,
          status: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  },
} satisfies Prisma.SaleInvoiceSelect;

export type SaleInvoiceDetailsFrontendRecord =
  Prisma.SaleInvoiceGetPayload<{
    select: typeof saleInvoiceDetailsFrontendSelect;
  }>;
