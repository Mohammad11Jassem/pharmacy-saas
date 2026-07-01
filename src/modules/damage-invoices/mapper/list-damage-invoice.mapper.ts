import { Prisma } from '../../../generated/prisma/client';

export const listDamageInvoiceSelect = {
  damageInvoiceId: true,
  invoiceNumber: true,
  damageReason: true,
  pharmacyInvoice: {
    select: {
      pharmacyInvoiceId: true,
      invoiceDate: true,
      status: true,
      notes: true,
      createdAt: true,
    },
  },

  items: {
    select: {
      quantityDamaged: true,
      unitConsumerPrice: true,
    },
  },

  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.DamageInvoiceSelect;

export type ListDamageInvoicePayload = Prisma.DamageInvoiceGetPayload<{
  select: typeof listDamageInvoiceSelect;
}>;

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return value ? Number(value) : 0;
}

export function mapDamageInvoiceListItem(invoice: ListDamageInvoicePayload) {
  const totalInvoicePrice = invoice.items.reduce((sum, item) => {
    const unitConsumerPrice = decimalToNumber(item.unitConsumerPrice);

    return sum + item.quantityDamaged * unitConsumerPrice;
  }, 0);

  const totalDamagedQuantity = invoice.items.reduce(
    (sum, item) => sum + item.quantityDamaged,
    0,
  );

  return {
    damageInvoiceId: invoice.damageInvoiceId,

    invoiceNumber: invoice.invoiceNumber,

    pharmacyInvoiceId: invoice.pharmacyInvoice.pharmacyInvoiceId,

    damageDate: invoice.pharmacyInvoice.invoiceDate,

    damageReason: invoice.damageReason,

    // totalInvoicePrice,

    formattedTotalInvoicePrice: totalInvoicePrice.toFixed(2),

    totalDamagedQuantity,

    itemsCount: invoice._count.items,

    status: invoice.pharmacyInvoice.status,

    notes: invoice.pharmacyInvoice.notes,

    createdAt: invoice.pharmacyInvoice.createdAt,
  };
}
