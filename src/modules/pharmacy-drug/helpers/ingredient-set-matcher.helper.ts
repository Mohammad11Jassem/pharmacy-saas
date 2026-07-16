import { IngredientSetMatchType } from '../enums/ingredient-set-match-type.enum';

export function classifyIngredientSetMatch(
  selectedIngredientIds: number[],
  candidateIngredientIds: number[],
): IngredientSetMatchType | null {
  const selectedIds = new Set(selectedIngredientIds);
  const candidateIds = new Set(candidateIngredientIds);

  const containsAllSelectedIngredients = [...selectedIds].every((id) =>
    candidateIds.has(id),
  );

  if (!containsAllSelectedIngredients) {
    return null;
  }

  if (selectedIds.size === candidateIds.size) {
    return IngredientSetMatchType.EXACT_INGREDIENT_SET;
  }

  return IngredientSetMatchType.CONTAINS_ALL_SELECTED_INGREDIENTS;
}

export function getIngredientSetMatchRank(
  matchType: IngredientSetMatchType,
): number {
  switch (matchType) {
    case IngredientSetMatchType.EXACT_INGREDIENT_SET:
      return 1;

    case IngredientSetMatchType.CONTAINS_ALL_SELECTED_INGREDIENTS:
      return 2;
  }
}
