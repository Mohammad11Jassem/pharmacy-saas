import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { DiscountType } from '../../../generated/prisma/enums';

export type DecimalInput = Prisma.Decimal | number | string;

export function calculateFinalPrice(
  basePrice: DecimalInput,
  discountType: DiscountType,
  discountValue: DecimalInput,
): Prisma.Decimal {
  const base = new Prisma.Decimal(basePrice.toString());

  const discount = new Prisma.Decimal(discountValue.toString());

  if (base.lessThan(0)) {
    throw new BadRequestException('Base price cannot be negative.');
  }

  if (discount.lessThan(0)) {
    throw new BadRequestException('Discount value cannot be negative.');
  }

  let finalPrice: Prisma.Decimal;

  if (discountType === DiscountType.PERCENTAGE) {
    if (discount.greaterThan(100)) {
      throw new BadRequestException('Percentage discount cannot exceed 100.');
    }

    finalPrice = base.minus(base.mul(discount).div(100));
    // finalPrice=basePrice - (basePrice * discountValue / 100);
  } else {
    finalPrice = base.minus(discount);
  }

  if (finalPrice.lessThan(0)) {
    return new Prisma.Decimal(0);
  }

  return finalPrice.toDecimalPlaces(2);
}

export function decimalToNumber(value: DecimalInput): number {
  return Number(value.toString());
}

export function addCalendarMonths(startDate: Date, months: number): Date {
  const result = new Date(startDate);

  const originalDay = result.getUTCDate();

  result.setUTCDate(1);

  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
}
