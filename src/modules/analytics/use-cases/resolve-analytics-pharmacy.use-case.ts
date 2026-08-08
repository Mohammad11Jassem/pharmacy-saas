import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ResolveAnalyticsPharmacyUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number): Promise<number> {
    const pharmacy = await this.prisma.dimPharmacy.findUnique({
      where: {
        pharmacyId,
      },

      select: {
        pharmacyKey: true,
      },
    });

    if (!pharmacy) {
      throw new NotFoundException(
        'Analytics data is not initialized for this pharmacy.',
      );
    }

    return pharmacy.pharmacyKey;
  }
}
