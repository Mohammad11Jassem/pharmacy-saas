import { BadRequestException } from '@nestjs/common';
import { DrugAlternativeMatchType } from '../enums/drug-alternative-match-type.enum';
import { PharmacyDrugAlternativeRecord } from '../selects/pharmacy-drug-alternatives.select';

export type UnifiedAlternativeIngredient = {
  ingredientId: number;
  ingredientName: string;
  strengthValue: number | null;
  unit: string | null;
  normalizedUnit: string | null;
};

export type UnifiedAlternativeDrugProfile = {
  pharmacyDrugId: number;
  drugId: number;
  source: PharmacyDrugAlternativeRecord['drug']['source'];
  tradeName: string;
  unitsPerBox: number;
  sellPart: boolean;
  isActive: boolean;
  dosageForm: {
    dosageFormId: number;
    dosageFormName: string;
    formCategory: string;
  };
  ingredients: UnifiedAlternativeIngredient[];
  netPrice: number | null;
  consumerPrice: number | null;
  compositionComplete: boolean;
};

export type AlternativeCandidate = UnifiedAlternativeDrugProfile & {
  matchType: DrugAlternativeMatchType;
  availableBaseQuantity: number;
};

export function toUnifiedAlternativeDrugProfile(
  record: PharmacyDrugAlternativeRecord,
): UnifiedAlternativeDrugProfile {
  const generalDrug = record.drug.generalDrug;
  const privateDrug = record.drug.privateDrug;
  const sourceDrug = generalDrug ?? privateDrug;

  if (!sourceDrug) {
    throw new BadRequestException(
      `Invalid drug data for pharmacyDrugId ${record.pharmacyDrugId}`,
    );
  }

  const ingredients = sourceDrug.ingredients
    .map((item) => ({
      ingredientId: item.ingredient.ingredientId,
      ingredientName: item.ingredient.ingredientName,
      strengthValue:
        item.strengthValue === null ? null : Number(item.strengthValue),
      unit: item.unit,
      normalizedUnit: normalizeUnit(item.unit),
    }))
    .sort(compareIngredients);

  return {
    pharmacyDrugId: record.pharmacyDrugId,
    drugId: record.drugId,
    source: record.drug.source,
    tradeName: sourceDrug.tradeName,
    unitsPerBox: sourceDrug.unitsPerBox,
    sellPart: record.sellPart,
    isActive: record.isActive && sourceDrug.isActive,
    dosageForm: sourceDrug.dosageForm,
    ingredients,
    netPrice:
      record.netPrice !== null
        ? Number(record.netPrice)
        : generalDrug
          ? Number(generalDrug.netPrice)
          : null,
    consumerPrice:
      record.consumerPrice !== null
        ? Number(record.consumerPrice)
        : generalDrug
          ? Number(generalDrug.consumerPrice)
          : null,
    compositionComplete:
      ingredients.length > 0 &&
      ingredients.every(
        (item) => item.strengthValue !== null && item.normalizedUnit !== null,
      ),
  };
}

export function assertAlternativeCompositionCanBeMatched(
  target: UnifiedAlternativeDrugProfile,
): void {
  if (!target.compositionComplete) {
    throw new BadRequestException(
      'Drug alternatives cannot be calculated because the target drug composition is incomplete',
    );
  }
}

export function classifyAlternativeMatch(
  target: UnifiedAlternativeDrugProfile,
  candidate: UnifiedAlternativeDrugProfile,
): DrugAlternativeMatchType | null {
  if (!candidate.compositionComplete) {
    return null;
  }

  if (!hasSameIngredientSet(target, candidate)) {
    return null;
  }

  const sameStrengthComposition = hasSameStrengthComposition(target, candidate);

  const sameDosageForm =
    target.dosageForm.dosageFormId === candidate.dosageForm.dosageFormId;

  if (sameStrengthComposition && sameDosageForm) {
    return DrugAlternativeMatchType.EXACT_COMPOSITION;
  }

  if (!sameStrengthComposition && sameDosageForm) {
    return DrugAlternativeMatchType.SAME_INGREDIENTS_DIFFERENT_STRENGTH;
  }

  if (sameStrengthComposition && !sameDosageForm) {
    return DrugAlternativeMatchType.SAME_INGREDIENTS_DIFFERENT_FORM;
  }

  return null;
}

export function compareAlternativeCandidates(
  left: AlternativeCandidate,
  right: AlternativeCandidate,
): number {
  const rankDifference =
    getMatchRank(left.matchType) - getMatchRank(right.matchType);

  if (rankDifference !== 0) {
    return rankDifference;
  }

  if (left.availableBaseQuantity !== right.availableBaseQuantity) {
    return right.availableBaseQuantity - left.availableBaseQuantity;
  }

  return left.tradeName.localeCompare(right.tradeName);
}

export function mapAlternativeTargetResponse(
  target: UnifiedAlternativeDrugProfile,
) {
  return {
    pharmacyDrugId: target.pharmacyDrugId,
    tradeName: target.tradeName,
    source: target.source,
    dosageForm: target.dosageForm,
    ingredients: mapIngredientsResponse(target.ingredients),
  };
}

export function mapAlternativeCandidateResponse(
  alternative: AlternativeCandidate,
) {
  return {
    pharmacyDrugId: alternative.pharmacyDrugId,
    tradeName: alternative.tradeName,
    source: alternative.source,
    matchType: alternative.matchType,
    dosageForm: alternative.dosageForm,
    ingredients: mapIngredientsResponse(alternative.ingredients),
    unitsPerBox: alternative.unitsPerBox,
    sellPart: alternative.sellPart,
    netPrice: alternative.netPrice,
    consumerPrice: alternative.consumerPrice,
    stock: {
      availableBaseQuantity: alternative.availableBaseQuantity,
      availableFullBoxes:
        alternative.unitsPerBox > 0
          ? Math.floor(
              alternative.availableBaseQuantity / alternative.unitsPerBox,
            )
          : 0,
      isAvailable: alternative.availableBaseQuantity > 0,
    },
  };
}

function hasSameIngredientSet(
  target: UnifiedAlternativeDrugProfile,
  candidate: UnifiedAlternativeDrugProfile,
): boolean {
  const targetIds = target.ingredients.map((item) => String(item.ingredientId));
  const candidateIds = candidate.ingredients.map((item) =>
    String(item.ingredientId),
  );

  return areStringArraysEqual(targetIds, candidateIds);
}

function hasSameStrengthComposition(
  target: UnifiedAlternativeDrugProfile,
  candidate: UnifiedAlternativeDrugProfile,
): boolean {
  const targetTokens = target.ingredients.map(toStrengthToken);
  const candidateTokens = candidate.ingredients.map(toStrengthToken);

  return areStringArraysEqual(targetTokens, candidateTokens);
}

function compareIngredients(
  left: UnifiedAlternativeIngredient,
  right: UnifiedAlternativeIngredient,
): number {
  if (left.ingredientId !== right.ingredientId) {
    return left.ingredientId - right.ingredientId;
  }

  return toStrengthToken(left).localeCompare(toStrengthToken(right));
}

function toStrengthToken(item: UnifiedAlternativeIngredient): string {
  return [
    item.ingredientId,
    item.strengthValue ?? 'null',
    item.normalizedUnit ?? 'null',
  ].join(':');
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function normalizeUnit(unit: string | null): string | null {
  const normalized = unit?.trim().toLowerCase().replace(/\s+/g, '');

  return normalized || null;
}

function getMatchRank(matchType: DrugAlternativeMatchType): number {
  switch (matchType) {
    case DrugAlternativeMatchType.EXACT_COMPOSITION:
      return 1;

    case DrugAlternativeMatchType.SAME_INGREDIENTS_DIFFERENT_STRENGTH:
      return 2;

    case DrugAlternativeMatchType.SAME_INGREDIENTS_DIFFERENT_FORM:
      return 3;
  }
}

function mapIngredientsResponse(ingredients: UnifiedAlternativeIngredient[]) {
  return ingredients.map((item) => ({
    ingredientId: item.ingredientId,
    ingredientName: item.ingredientName,
    strengthValue: item.strengthValue,
    unit: item.unit,
  }));
}
