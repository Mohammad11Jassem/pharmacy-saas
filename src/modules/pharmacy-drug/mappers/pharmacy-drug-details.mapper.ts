import { map } from 'rxjs';
import type {
  PharmacyDrugGetPayload,
  PharmacyDrugSelect,
} from '../../../generated/prisma/models/PharmacyDrug';

export const pharmacyDrugDetailsSelect = {
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

  drug: {
    select: {
      drugId: true,
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
                  description: true,
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
                  description: true,
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
        },
      },
    },
  },
} satisfies PharmacyDrugSelect;

export type PharmacyDrugDetailsRecord =
  PharmacyDrugGetPayload<{
    select: typeof pharmacyDrugDetailsSelect;
  }>;

type GeneralDrugRecord =
  NonNullable<
    PharmacyDrugDetailsRecord['drug']['generalDrug']
  >;

type PrivateDrugRecord =
  NonNullable<
    PharmacyDrugDetailsRecord['drug']['privateDrug']
  >;

type DrugIngredientRecord =
  GeneralDrugRecord['ingredients'][number];

type DrugCategoryRecord =
  GeneralDrugRecord['categories'][number];

type CatalogPricesResponse = {
  netPrice: number | null;
  consumerPrice: number | null;
};

type UnifiedDrugIngredientResponse = {
  drugIngredientId: number;
  ingredientId: number;
  ingredientName: string;
  description: string | null;
  strengthValue: number | null;
  unit: string;
};

type UnifiedDrugCategoryResponse = {
  uniqueId: number;
  categoryId: number;
  categoryName: string;
  description: string | null;
};

type UnifiedDrugResponse = {
  sourceDrugId: number;
  tradeName: string;
  barcode: string | null;
  unitsPerBox: number | null;
  isRx: boolean;
  isActive: boolean;

  dosageForm: {
    dosageFormId: number;
    dosageFormName: string;
    formCategory: string;
  };

  catalogPrices: CatalogPricesResponse;
  ingredients: UnifiedDrugIngredientResponse[];
  categories: UnifiedDrugCategoryResponse[];
};

function decimalToNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function mapIngredients(
  ingredients: DrugIngredientRecord[],
): UnifiedDrugIngredientResponse[] {
  return ingredients.map(
    (item: DrugIngredientRecord) => ({
      drugIngredientId:
        item.drugIngredientId,

      ingredientId:
        item.ingredient.ingredientId,

      ingredientName:
        item.ingredient.ingredientName,

      description:
        item.ingredient.description,

      strengthValue:
        decimalToNumber(
          item.strengthValue,
        ),

      unit:
        item.unit,
    }),
  );
}

function mapCategories(
  categories: DrugCategoryRecord[],
): UnifiedDrugCategoryResponse[] {
  return categories.map(
    (item: DrugCategoryRecord) => ({
      uniqueId:
        item.uniqueId,

      categoryId:
        item.category.categoryId,

      categoryName:
        item.category.categoryName,

      description:
        item.category.description,
    }),
  );
}

function mapGeneralDrug(
  generalDrug: GeneralDrugRecord,
): UnifiedDrugResponse {
  return {
    sourceDrugId:
      generalDrug.generalDrugId,

    tradeName:
      generalDrug.tradeName,

    barcode:
      generalDrug.barcode,

    unitsPerBox:
      generalDrug.unitsPerBox,

    isRx:
      generalDrug.isRx,

    isActive:
      generalDrug.isActive,

    dosageForm:
      generalDrug.dosageForm,

    catalogPrices: {
      netPrice:
        decimalToNumber(
          generalDrug.netPrice,
        ),

      consumerPrice:
        decimalToNumber(
          generalDrug.consumerPrice,
        ),
    },

    ingredients:
      mapIngredients(
        generalDrug.ingredients,
      ),

    categories:
      mapCategories(
        generalDrug.categories,
      ),
  };
}

function mapPrivateDrug(
  privateDrug: PrivateDrugRecord,
): UnifiedDrugResponse {
  return {
    sourceDrugId:
      privateDrug.privateDrugId,

    tradeName:
      privateDrug.tradeName,

    barcode:
      privateDrug.barcode,

    unitsPerBox:
      privateDrug.unitsPerBox,

    isRx:
      privateDrug.isRx,

    isActive:
      privateDrug.isActive,

    dosageForm:
      privateDrug.dosageForm,

    catalogPrices: {
      netPrice: null,
      consumerPrice: null,
    },

    // ingredients: mapIngredients(privateDrug.ingredients), 
    // categories: mapCategories(privateDrug.categories), 
    ingredients: [],
    categories: [],
  };
}

export function mapPharmacyDrugDetails(
  pharmacyDrug: PharmacyDrugDetailsRecord,
) {
  const generalDrug =
    pharmacyDrug.drug.generalDrug;

  const privateDrug =
    pharmacyDrug.drug.privateDrug;

  if (!generalDrug && !privateDrug) {
    throw new Error(
      'Invalid drug data: drug must be GENERAL or PRIVATE',
    );
  }

  const unifiedDrug: UnifiedDrugResponse =
    generalDrug
      ? mapGeneralDrug(generalDrug)
      : mapPrivateDrug(privateDrug as PrivateDrugRecord);

  return {
    pharmacyDrugId:
      pharmacyDrug.pharmacyDrugId,

    pharmacyId:
      pharmacyDrug.pharmacyId,

    drugId:
      pharmacyDrug.drugId,

    source:
      pharmacyDrug.drug.source,

    drug:
      unifiedDrug,

    pharmacyDrugDetails: {
      minStockAlert:
        pharmacyDrug.minStockAlert,

      sellPart:
        pharmacyDrug.sellPart,

      netPrice:
        decimalToNumber(
          pharmacyDrug.netPrice,
        ),

      consumerPrice:
        decimalToNumber(
          pharmacyDrug.consumerPrice,
        ),

      expiryDateAlarm:
        pharmacyDrug.expiryDateAlarm,

      isActive:
        pharmacyDrug.isActive,

      notes:
        pharmacyDrug.notes,
    },

    locations:
      pharmacyDrug.drugLocations.map(
        (location) => ({
          drugLocationId:
            location.drugLocationId,

          storageLocation:
            location.storageLocation,
        }),
      ),

    createdAt:
      pharmacyDrug.createdAt,

    updatedAt:
      pharmacyDrug.updatedAt,
  };
}