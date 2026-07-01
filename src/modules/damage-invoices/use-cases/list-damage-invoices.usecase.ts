import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { listDamageInvoiceSelect, mapDamageInvoiceListItem } from '../mapper/list-damage-invoice.mapper';


@Injectable()
export class ListDamageInvoicesUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    page = 1,
    limit = 20,
  ) {
    const safePage =
      Math.max(Number(page) || 1, 1);

    const safeLimit =
      Math.min(
        Math.max(Number(limit) || 20, 1),
        100,
      );

    const skip =
      (safePage - 1) * safeLimit;

    const where: Prisma.DamageInvoiceWhereInput = {
      pharmacyInvoice: {
        pharmacyId,
      },
    };

    const [damageInvoices, total] =
      await Promise.all([
        this.prisma.damageInvoice.findMany({
          where,

          skip,
          take: safeLimit,

          orderBy: {
            damageInvoiceId: 'desc',
          },

          select: listDamageInvoiceSelect,
        }),

        this.prisma.damageInvoice.count({
          where,
        }),
      ]);

    const mappedDamageInvoices =
      damageInvoices.map(mapDamageInvoiceListItem);

    const pages =
      Math.ceil(total / safeLimit);

    return {
      damageInvoices:
        mappedDamageInvoices,

      page:
        safePage,

      limit:
        safeLimit,

      total,

      pages,

      hasNextPage:
        safePage < pages,

      hasPreviousPage:
        safePage > 1,
    };
  }
}