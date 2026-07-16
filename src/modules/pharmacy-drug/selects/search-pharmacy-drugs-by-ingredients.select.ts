import { Prisma } from '../../../generated/prisma/client';

export const searchPharmacyDrugsByIngredientsSelect = {
  pharmacyDrugId: true,
  drugId: true,
  sellPart: true,
  netPrice: true,
  consumerPrice: true,

  drug: {
    select: {
      source: true,

      generalDrug: {
        select: {
          tradeName: true,
          barcode: true,
          unitsPerBox: true,
          netPrice: true,
          consumerPrice: true,

          dosageForm: {
            select: {
              dosageFormId: true,
              dosageFormName: true,
              formCategory: true,
            },
          },

          ingredients: {
            select: {
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
        },
      },

      privateDrug: {
        select: {
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

          ingredients: {
            select: {
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
        },
      },
    },
  },
} satisfies Prisma.PharmacyDrugSelect;

export type SearchPharmacyDrugsByIngredientsPayload =
  Prisma.PharmacyDrugGetPayload<{
    select: typeof searchPharmacyDrugsByIngredientsSelect;
  }>;
