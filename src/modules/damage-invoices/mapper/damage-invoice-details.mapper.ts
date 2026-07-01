import { Prisma } from '../../../generated/prisma/client';

export const damageInvoiceDetailsSelect = {
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

      batch: {
        select: {
          batchId: true,
          pharmacyDrugId: true,
          supplierInvoiceItemId: true,
          expiryDate: true,
          receivedDate: true,
          initialQuantity: true,
          soldQuantity: true,
          status: true,

          pharmacyDrug: {
            select: {
              pharmacyDrugId: true,
              drugId: true,
              consumerPrice: true,

              drug: {
                select: {
                  source: true,

                  generalDrug: {
                    select: {
                      generalDrugId: true,
                      tradeName: true,
                      barcode: true,
                      unitsPerBox: true,

                      dosageForm: {
                        select: {
                          dosageFormId: true,
                          dosageFormName: true,
                          formCategory: true,
                        },
                      },
                    },
                  },

                  privateDrug: {
                    select: {
                      privateDrugId: true,
                      tradeName: true,
                      barcode: true,
                      unitsPerBox: true,

                      dosageForm: {
                        select: {
                          dosageFormId: true,
                          dosageFormName: true,
                          formCategory: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },

          supplierInvoiceItem: {
            select: {
              supplierInvoiceItemId: true,
              quantity: true,
              netUnitPrice: true,
              totalPrice: true,

              supplierInvoice: {
                select: {
                  supplierInvoiceId: true,
                  invoiceNumber: true,
                  invoiceDate: true,

                  supplier: {
                    select: {
                      supplierId: true,
                      supplierName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DamageInvoiceSelect;

export type DamageInvoiceDetailsPayload =
  Prisma.DamageInvoiceGetPayload<{
    select: typeof damageInvoiceDetailsSelect;
  }>;

function decimalToNumber(
  value: Prisma.Decimal | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function formatMoney(value: number | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toFixed(2);
}

export function mapDamageInvoiceDetails(
  invoice: DamageInvoiceDetailsPayload,
) {
  const mappedItems = invoice.items.map((item) => {
    const generalDrug =
      item.batch.pharmacyDrug.drug.generalDrug;

    const privateDrug =
      item.batch.pharmacyDrug.drug.privateDrug;

    const drugInfo =
      generalDrug ?? privateDrug;

    const dosageForm =
      drugInfo?.dosageForm ?? null;

    const unitsPerBox =
      drugInfo?.unitsPerBox ?? null;

    const unitConsumerPrice =
      decimalToNumber(item.unitConsumerPrice) ?? 0;

    const totalLinePrice =
      unitConsumerPrice * item.quantityDamaged;

    const supplierInvoiceItem =
      item.batch.supplierInvoiceItem;

    const supplierInvoice =
      supplierInvoiceItem?.supplierInvoice ?? null;

    const supplier =
      supplierInvoice?.supplier ?? null;

    const availableQuantity =
      item.batch.initialQuantity - item.batch.soldQuantity;

    return {
      damageInvoiceItemId:
        item.damageInvoiceItemId,

      batchId:
        item.batchId,

      quantityDamaged:
        item.quantityDamaged,

    //   unitConsumerPrice,

      formattedUnitConsumerPrice:
        formatMoney(unitConsumerPrice),

      totalLinePrice,

      formattedTotalLinePrice:
        formatMoney(totalLinePrice),

      notes:
        item.notes,

      createdAt:
        item.createdAt,

      drug: {
        pharmacyDrugId:
          item.batch.pharmacyDrug.pharmacyDrugId,

        // drugId:
        //   item.batch.pharmacyDrug.drugId,

        // source:
        //   item.batch.pharmacyDrug.drug.source,

        sourceText:
          item.batch.pharmacyDrug.drug.source === 'GENERAL'
            ? 'دواء عام'
            : 'دواء خاص',

        // sourceDrugId:
        //   generalDrug?.generalDrugId ??
        //   privateDrug?.privateDrugId ??
        //   null,

        tradeName:
          drugInfo?.tradeName ?? null,

        barcode:
          drugInfo?.barcode ?? null,

        // unitsPerBox,

        // dosageForm: dosageForm
        //   ? {
        //       dosageFormId:
        //         dosageForm.dosageFormId,

        //       dosageFormName:
        //         dosageForm.dosageFormName,

        //       formCategory:
        //         dosageForm.formCategory,

        //       displayText:
        //         unitsPerBox
        //           ? `${dosageForm.dosageFormName} (${unitsPerBox})`
        //           : dosageForm.dosageFormName,
        //     }
        //   : null,
      },

    //   batch: {
    //     batchId:
    //       item.batch.batchId,

    //     pharmacyDrugId:
    //       item.batch.pharmacyDrugId,

    //     supplierInvoiceItemId:
    //       item.batch.supplierInvoiceItemId,

    //     expiryDate:
    //       item.batch.expiryDate,

    //     receivedDate:
    //       item.batch.receivedDate,

    //     initialQuantity:
    //       item.batch.initialQuantity,

    //     soldQuantity:
    //       item.batch.soldQuantity,

    //     availableQuantity,

    //     status:
    //       item.batch.status,
    //   },

      supplier: supplier
        ? {
            supplierId:
              supplier.supplierId,

            supplierName:
              supplier.supplierName,

            // phone:
            //   supplier.phone,

            // supplierInvoiceId:
            //   supplierInvoice?.supplierInvoiceId ?? null,

            // supplierInvoiceNumber:
            //   supplierInvoice?.invoiceNumber ?? null,

            // supplierInvoiceDate:
            //   supplierInvoice?.invoiceDate ?? null,

            // supplierInvoiceItemId:
            //   supplierInvoiceItem?.supplierInvoiceItemId ?? null,
          }
        : null,
    };
  });

  const totalDamagedQuantity =
    mappedItems.reduce(
      (sum, item) =>
        sum + item.quantityDamaged,
      0,
    );

  const totalInvoicePrice =
    mappedItems.reduce(
      (sum, item) =>
        sum + item.totalLinePrice,
      0,
    );



  return {
    damageInvoiceId:
      invoice.damageInvoiceId,

    invoiceNumber:
      invoice.invoiceNumber,

    damageReason:invoice.damageReason,
    // pharmacyInvoiceId:
    //   invoice.pharmacyInvoice.pharmacyInvoiceId,

    damageDate:
      invoice.pharmacyInvoice.invoiceDate,

    status:
      invoice.pharmacyInvoice.status,

    notes:
      invoice.pharmacyInvoice.notes,

    totalDamagedQuantity,

    // totalInvoicePrice,

    formattedTotalInvoicePrice:
      formatMoney(totalInvoicePrice),

    itemsCount:
      mappedItems.length,

    items:
      mappedItems,

    createdAt:
      invoice.pharmacyInvoice.createdAt,

    updatedAt:
      invoice.pharmacyInvoice.updatedAt,
  };
}