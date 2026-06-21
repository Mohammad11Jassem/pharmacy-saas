import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
    const skip = (page - 1) * limit;

    const where: Prisma.DamageInvoiceWhereInput = {
      pharmacyInvoice: {
        pharmacyId,
      },
    };

    const [damageInvoices, total] = await Promise.all([
      this.prisma.damageInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          damageInvoiceId: 'desc',
        },
        select: {
          damageInvoiceId: true,

          pharmacyInvoice: {
            select: {
              pharmacyInvoiceId: true,
              invoiceDate: true,
              invoiceType: true,
              status: true,
              notes: true,
              createdAt: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },
        },
      }),

      this.prisma.damageInvoice.count({
        where,
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      damageInvoices,
      page,
      limit,
      total,
      pages,
      hasNextPage: page < pages,
      hasPreviousPage: page > 1,
    };
  }
}