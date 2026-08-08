export type DrugDisplayData = {
  generalDrug: {
    tradeName: string;
    unitsPerBox: number;
  } | null;

  privateDrug: {
    tradeName: string;
    unitsPerBox: number;
  } | null;
};

export function getDrugName(drug: DrugDisplayData): string {
  return (
    drug.generalDrug?.tradeName ?? drug.privateDrug?.tradeName ?? 'Unknown drug'
  );
}

export function getUnitsPerBox(drug: DrugDisplayData): number {
  return drug.generalDrug?.unitsPerBox ?? drug.privateDrug?.unitsPerBox ?? 1;
}
