
import { decimalToNumber, formatMoney } from '../helpers/pharmacy-drug-function.helper';
import type { ListPharmacyDrugPayload } from '../selects/list-pharmacy-drug.select';

export function mapPharmacyDrug(pharmacyDrug: ListPharmacyDrugPayload) {
  const generalDrug = pharmacyDrug.drug.generalDrug;
  const privateDrug = pharmacyDrug.drug.privateDrug;
  const drugInfo = generalDrug ?? privateDrug;

  const availableQuantity = pharmacyDrug.batches.reduce(
    (sum, batch) =>
      sum + (batch.initialQuantity - batch.soldQuantity),
    0,
  );

  const minStockAlert = pharmacyDrug.minStockAlert ?? 0;

  const isOutOfStock = availableQuantity <= 0;

  const isLowStock =
    !isOutOfStock &&
    pharmacyDrug.minStockAlert !== null &&
    pharmacyDrug.minStockAlert !== undefined &&
    availableQuantity <= pharmacyDrug.minStockAlert;

  const stockStatus =
    isOutOfStock
      ? 'OUT_OF_STOCK'
      : isLowStock
        ? 'LOW_STOCK'
        : 'AVAILABLE';

  const ingredients =
    generalDrug?.ingredients.map((item) => ({
      drugIngredientId: item.drugIngredientId,
      ingredientId: item.ingredient.ingredientId,
      ingredientName: item.ingredient.ingredientName,
      strengthValue: decimalToNumber(item.strengthValue),
      unit: item.unit,
    })) ?? [];

  const ingredientsText =
    ingredients.length > 0
      ? ingredients
          .map((item) => {
            const strength =
              item.strengthValue !== null
                ? ` ${item.strengthValue}`
                : '';

            const unit = item.unit ? ` ${item.unit}` : '';

            return `${item.ingredientName}${strength}${unit}`;
          })
          .join(' + ')
      : null;

  const categories =
    generalDrug?.categories.map((item) => ({
      uniqueId: item.uniqueId,
      categoryId: item.category.categoryId,
      categoryName: item.category.categoryName,
    })) ?? [];

  const dosageForm = drugInfo?.dosageForm ?? null;
  const unitsPerBox = drugInfo?.unitsPerBox ?? null;

  return {
    pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
    drugId: pharmacyDrug.drugId,

    source: pharmacyDrug.drug.source,

    sourceText:
      pharmacyDrug.drug.source === 'GENERAL'
        ? 'دواء عام'
        : 'دواء خاص',

    tradeName: drugInfo?.tradeName ?? null,

    subtitle: ingredientsText,

    barcode: drugInfo?.barcode ?? null,

    categories,

    dosageForm: dosageForm
      ? {
          dosageFormId: dosageForm.dosageFormId,
          dosageFormName: dosageForm.dosageFormName,
          formCategory: dosageForm.formCategory,

          displayText: unitsPerBox
            ? `${dosageForm.dosageFormName} (${unitsPerBox})`
            : dosageForm.dosageFormName,
        }
      : null,

    unitsPerBox,

    isRx: drugInfo?.isRx ?? false,

    isDrugActive: drugInfo?.isActive ?? false,

    pharmacyDrugDetails: {
      minStockAlert: pharmacyDrug.minStockAlert,
      sellPart: pharmacyDrug.sellPart,

      netPrice: decimalToNumber(pharmacyDrug.netPrice),
      consumerPrice: decimalToNumber(pharmacyDrug.consumerPrice),

      formattedNetPrice: formatMoney(pharmacyDrug.netPrice),
      formattedConsumerPrice: formatMoney(pharmacyDrug.consumerPrice),

      expiryDateAlarm: pharmacyDrug.expiryDateAlarm,
      isActive: pharmacyDrug.isActive,
      notes: pharmacyDrug.notes,
    },

    stock: {
      availableQuantity,
      availableQuantityText: `${availableQuantity} عبوة`,
      minStockAlert,
      isLowStock,
      isOutOfStock,
      status: stockStatus,
      batchesCount: pharmacyDrug.batches.length,
    },

    locations: pharmacyDrug.drugLocations.map((location) => ({
      drugLocationId: location.drugLocationId,
      storageLocation: location.storageLocation,
    })),

    createdAt: pharmacyDrug.createdAt,
    updatedAt: pharmacyDrug.updatedAt,
  };
}