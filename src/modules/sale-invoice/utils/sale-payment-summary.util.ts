import { Prisma } from '../../../generated/prisma/client';

type MoneyValue = Prisma.Decimal | number | string;

export function calculateSalePaymentSummary(
  totalAmount: MoneyValue,
  paidAmount: MoneyValue,
  refundAmounts: readonly MoneyValue[],
) {
  const totalAmountCents = toCents(totalAmount);
  const paidAmountCents = toCents(paidAmount);

  const returnedAmountCents = refundAmounts.reduce<number>(
    (sum, amount) => sum + toCents(amount),
    0,
  );

  const payableAmountCents = Math.max(
    totalAmountCents - returnedAmountCents,
    0,
  );

  const remainingAmountCents = Math.max(
    payableAmountCents - paidAmountCents,
    0,
  );

  return {
    returnedAmount: fromCents(returnedAmountCents),
    payableAmount: fromCents(payableAmountCents),
    remainingAmount: fromCents(remainingAmountCents),
  };
}

function toCents(value: MoneyValue): number {
  return Math.round(Number(value) * 100);
}

function fromCents(value: number): number {
  return value / 100;
}
