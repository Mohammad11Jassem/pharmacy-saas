import { UnitType } from '../../generated/prisma/client';

export type LargestSaleUnit = {
  unitType: UnitType;
  unitLabel: string;
  unitFactorToBase: number;
};

/**
 * Resolves the largest sale unit that can be inferred from the current schema.
 *
 * Current stock representation uses STRIP as the base inventory unit:
 * - BOX contains unitsPerBox base units.
 * - STRIP has a factor of 1.
 *
 * Rules:
 * - unitsPerBox > 1  => BOX is the larger unit.
 * - unitsPerBox = 1 and sellPart = true => STRIP is the effective largest unit.
 * - unitsPerBox = 1 and sellPart = false => keep BOX as the only allowed unit.
 */
export function resolveLargestSaleUnit(
  unitsPerBox: number,
  sellPart: boolean,
): LargestSaleUnit {
  if (!Number.isInteger(unitsPerBox) || unitsPerBox <= 0) {
    throw new Error('unitsPerBox must be a positive integer');
  }

  if (unitsPerBox > 1 || !sellPart) {
    return {
      unitType: UnitType.BOX,
      unitLabel: 'عبوة',
      unitFactorToBase: unitsPerBox,
    };
  }

  return {
    unitType: UnitType.STRIP,
    unitLabel: 'ظرف',
    unitFactorToBase: 1,
  };
}
