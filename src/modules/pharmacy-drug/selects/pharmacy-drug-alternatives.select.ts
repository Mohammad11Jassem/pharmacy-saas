import { Prisma } from '../../../generated/prisma/client';

export const pharmacyDrugAlternativeSelect = {
  pharmacyDrugId: true,
  drugId: true,
  sellPart: true,
  netPrice: true,
  consumerPrice: true,
  isActive: true,
  drug: {
    select: {
      source: true,
      generalDrug: {
        select: {
          tradeName: true,
          unitsPerBox: true,
          netPrice: true,
          consumerPrice: true,
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
          unitsPerBox: true,
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

export type PharmacyDrugAlternativeRecord = Prisma.PharmacyDrugGetPayload<{
  select: typeof pharmacyDrugAlternativeSelect;
}>;
