import { IngredientSetMatchType } from '../enums/ingredient-set-match-type.enum';
import { classifyIngredientSetMatch } from './ingredient-set-matcher.helper';

describe('classifyIngredientSetMatch', () => {
  it('returns EXACT_INGREDIENT_SET for the same ingredient set', () => {
    expect(classifyIngredientSetMatch([1, 5], [5, 1])).toBe(
      IngredientSetMatchType.EXACT_INGREDIENT_SET,
    );
  });

  it('returns CONTAINS_ALL_SELECTED_INGREDIENTS when candidate has extras', () => {
    expect(classifyIngredientSetMatch([1, 5], [1, 5, 8])).toBe(
      IngredientSetMatchType.CONTAINS_ALL_SELECTED_INGREDIENTS,
    );
  });

  it('returns null when a selected ingredient is missing', () => {
    expect(classifyIngredientSetMatch([1, 5], [1, 8])).toBeNull();
  });

  it('ignores duplicate ingredient ids while comparing sets', () => {
    expect(classifyIngredientSetMatch([1, 5], [1, 1, 5])).toBe(
      IngredientSetMatchType.EXACT_INGREDIENT_SET,
    );
  });
});
