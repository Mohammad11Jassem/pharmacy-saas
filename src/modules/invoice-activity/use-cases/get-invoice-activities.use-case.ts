import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

import { getActivityDateRange } from '../utils/activity-date-range.util';
import { EnsureOwnerPharmacyAccessUseCase } from '../../../common/use-cases/ensure-owner-pharmacy-access.use-case';

@Injectable()
export class GetInvoiceActivitiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ensureOwnerPharmacyAccess: EnsureOwnerPharmacyAccessUseCase,
  ) {}

  async execute(
    ownerUserId: number,
    pharmacyId: number,
    date: string,
    page: number,
    limit: number,
  ) {
    await this.ensureOwnerPharmacyAccess.execute(ownerUserId, pharmacyId);
    const { startAt, endAt } = getActivityDateRange(date);

    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceActivityWhereInput = {
      pharmacyId,

      occurredAt: {
        gte: startAt,
        lt: endAt,
      },
    };

    const [activities, totalItems] = await this.prisma.$transaction([
      this.prisma.invoiceActivity.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          occurredAt: 'desc',
        },

        select: {
          invoiceActivityId: true,
          message: true,
          occurredAt: true,
        },
      }),

      this.prisma.invoiceActivity.count({
        where,
      }),
    ]);

    return {
      items: activities,

      meta: {
        page,
        limit,
        totalItems,

        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }
}
