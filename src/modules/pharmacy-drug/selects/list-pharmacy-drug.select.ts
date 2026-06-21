import { Prisma } from '../../../generated/prisma/client';

export const listPharmacyDrugSelect = {
  pharmacyDrugId: true,
  pharmacyId: true,
  drugId: true,

  minStockAlert: true,
  sellPart: true,
  netPrice: true,
  consumerPrice: true,
  expiryDateAlarm: true,
  isActive: true,
  notes: true,

  createdAt: true,
  updatedAt: true,

  drugLocations: {
    select: {
      drugLocationId: true,
      storageLocation: true,
    },
  },

  batches: {
    select: {
      batchId: true,
      initialQuantity: true,
      soldQuantity: true,
      expiryDate: true,
      receivedDate: true,
    },
  },

  drug: {
    select: {
      source: true,

      generalDrug: {
        select: {
          generalDrugId: true,
          tradeName: true,
          barcode: true,
          unitsPerBox: true,
          netPrice: true,
          consumerPrice: true,
          isRx: true,
          isActive: true,

          dosageForm: {
            select: {
              dosageFormId: true,
              dosageFormName: true,
              formCategory: true,
            },
          },

          ingredients: {
            select: {
              drugIngredientId: true,
              strengthValue: true,
              unit: true,

              ingredient: {
                select: {
                  ingredientId: true,
                  ingredientName: true,
                },
              },
            },
          },

          categories: {
            select: {
              uniqueId: true,

              category: {
                select: {
                  categoryId: true,
                  categoryName: true,
                },
              },
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
          isRx: true,
          isActive: true,

          dosageForm: {
            select: {
              dosageFormId: true,
              dosageFormName: true,
              formCategory: true,
            },
          },

          ingredients: {
            select: {
              privateDrugIngredientId: true,
              strengthValue: true,
              unit: true,

              ingredient: {
                select: {
                  ingredientId: true,
                  ingredientName: true,
                },
              },
            },
          },

          categories: {
            select: {
              uniqueId: true,

              category: {
                select: {
                  categoryId: true,
                  categoryName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PharmacyDrugSelect;

export type ListPharmacyDrugPayload = Prisma.PharmacyDrugGetPayload<{
  select: typeof listPharmacyDrugSelect;
}>;
