import { Prisma } from '../../../generated/prisma/client';

export function buildSearchPharmacyDrugSelect(today: Date) {
  return {
    pharmacyDrugId: true,
    drugId: true,

    batches: {
      where: {
        status: 'ACTIVE',
        OR: [
          {
            expiryDate: null,
          },
          {
            expiryDate: {
              gte: today,
            },
          },
        ],
      },
      select: {
        initialQuantity: true,
        soldQuantity: true,
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
          },
        },

        privateDrug: {
          select: {
            privateDrugId: true,
            tradeName: true,
            barcode: true,
            unitsPerBox: true,
          },
        },
      },
    },
  } satisfies Prisma.PharmacyDrugSelect;
}

export const searchGeneralDrugSelect = {
  generalDrugId: true,
  drugId: true,
  tradeName: true,
  barcode: true,
} satisfies Prisma.GeneralDrugSelect;

export type SearchPharmacyDrugPayload = Prisma.PharmacyDrugGetPayload<{
  select: ReturnType<typeof buildSearchPharmacyDrugSelect>;
}>;

export type SearchGeneralDrugPayload = Prisma.GeneralDrugGetPayload<{
  select: typeof searchGeneralDrugSelect;
}>;

export function mapPharmacyDrugForSearch(
  pharmacyDrug: SearchPharmacyDrugPayload,
) {
  const generalDrug = pharmacyDrug.drug.generalDrug;
  const privateDrug = pharmacyDrug.drug.privateDrug;

  const unitsPerBox =
    generalDrug?.unitsPerBox ?? privateDrug?.unitsPerBox ?? null;

    // to make sure that the available quantity is not negative, we use Math.max to ensure that the result is at least 0. This prevents any potential issues with negative quantities in the database.
  const availableQuantity = pharmacyDrug.batches.reduce(
    (sum, batch) =>
      sum + Math.max(batch.initialQuantity - batch.soldQuantity, 0),
    0,
  );

  const availableBoxCount =
    unitsPerBox && unitsPerBox > 0
      ? Number((availableQuantity / unitsPerBox).toFixed(2))
      : null;

  return {
    pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
    drugId: pharmacyDrug.drugId,

    source: pharmacyDrug.drug.source,

    sourceDrugId:
      generalDrug?.generalDrugId ?? privateDrug?.privateDrugId ?? null,

    tradeName: generalDrug?.tradeName ?? privateDrug?.tradeName ?? null,

    barcode: generalDrug?.barcode ?? privateDrug?.barcode ?? null,

    unitsPerBox,

    availableQuantity,

    availableBoxCount,
  };
}

export function mapGeneralDrugForSearch(generalDrug: SearchGeneralDrugPayload) {
  return {
    generalDrugId: generalDrug.generalDrugId,
    drugId: generalDrug.drugId,

    tradeName: generalDrug.tradeName,
    barcode: generalDrug.barcode,
  };
}
