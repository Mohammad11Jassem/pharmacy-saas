import { BadRequestException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '../../../generated/prisma/client';

type MoneyValue = Prisma.Decimal | number | string;

export function resolveSupplierPayment(
  requestedStatus: PaymentStatus | undefined,
  requestedPaidAmount: number | undefined,
  totalPrice: MoneyValue,
): {
  paymentStatus: PaymentStatus;
  paidAmount: number;
} {
  const paymentStatus = requestedStatus ?? PaymentStatus.PENDING;
  const totalPriceCents = toCents(totalPrice);

  if (totalPriceCents < 0) {
    throw new BadRequestException('totalPrice must not be negative');
  }

  if (
    requestedPaidAmount !== undefined &&
    !Number.isFinite(requestedPaidAmount)
  ) {
    throw new BadRequestException('paidAmount must be a valid number');
  }

  const paidAmountCents = toCents(requestedPaidAmount ?? 0);

  if (paidAmountCents < 0) {
    throw new BadRequestException('paidAmount must not be negative');
  }

  if (totalPriceCents === 0) {
    if (paidAmountCents !== 0) {
      throw new BadRequestException(
        'paidAmount must be 0 when totalPrice is 0',
      );
    }

    if (paymentStatus === PaymentStatus.PARTIAL) {
      throw new BadRequestException(
        'A zero-total supplier invoice cannot be partially paid',
      );
    }

    return {
      paymentStatus: PaymentStatus.PAID,
      paidAmount: 0,
    };
  }

  switch (paymentStatus) {
    case PaymentStatus.PENDING:
      if (paidAmountCents !== 0) {
        throw new BadRequestException(
          'paidAmount must be 0 when paymentStatus is PENDING',
        );
      }

      return {
        paymentStatus: PaymentStatus.PENDING,
        paidAmount: 0,
      };

    case PaymentStatus.PARTIAL:
      if (requestedPaidAmount === undefined) {
        throw new BadRequestException(
          'paidAmount is required when paymentStatus is PARTIAL',
        );
      }

      if (paidAmountCents <= 0 || paidAmountCents >= totalPriceCents) {
        throw new BadRequestException(
          'For PARTIAL payment, paidAmount must be greater than 0 and less than totalPrice',
        );
      }

      return {
        paymentStatus: PaymentStatus.PARTIAL,
        paidAmount: fromCents(paidAmountCents),
      };

    case PaymentStatus.PAID:
      if (
        requestedPaidAmount !== undefined &&
        paidAmountCents !== totalPriceCents
      ) {
        throw new BadRequestException(
          'When paymentStatus is PAID, paidAmount must equal totalPrice',
        );
      }

      return {
        paymentStatus: PaymentStatus.PAID,
        paidAmount: fromCents(totalPriceCents),
      };

    default:
      throw new BadRequestException('Invalid paymentStatus');
  }
}

export function calculateSupplierPaymentSummary(
  totalPrice: MoneyValue,
  paidAmount: MoneyValue,
) {
  const totalPriceCents = toCents(totalPrice);
  const paidAmountCents = toCents(paidAmount);

  return {
    payableAmount: fromCents(totalPriceCents),
    remainingAmount: fromCents(Math.max(totalPriceCents - paidAmountCents, 0)),
  };
}

export function toMoneyCents(value: MoneyValue): number {
  return toCents(value);
}

function toCents(value: MoneyValue): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new BadRequestException('Money value must be a valid number');
  }

  return Math.round(numericValue * 100);
}

function fromCents(value: number): number {
  return value / 100;
}
