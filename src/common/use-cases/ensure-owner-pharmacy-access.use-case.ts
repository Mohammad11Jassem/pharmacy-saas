import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnsureOwnerPharmacyAccessUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerUserId: number, pharmacyId: number): Promise<void> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: {
        pharmacyId,

        pharmacyOwner: {
          is: {
            userId: ownerUserId,
          },
        },
      },

      select: {
        pharmacyId: true,
      },
    });

    if (!pharmacy) {
      throw new ForbiddenException('طلب غير صحيح: لا يوجد لديك صلاحية الوصول .');
    }
  }
}
