import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  mapPharmacyDrugDetails,
  pharmacyDrugDetailsSelect,
} from '../mappers/pharmacy-drug-details.mapper';

@Injectable()
export class GetPharmacyDrugDetailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    pharmacyDrugId: number,
  ) {
    const pharmacyDrug =
      await this.prisma.pharmacyDrug.findFirst({
        where: {
          pharmacyDrugId,
          pharmacyId,
        },

        select: pharmacyDrugDetailsSelect,
      });

    if (!pharmacyDrug) {
      throw new NotFoundException(
        'Pharmacy drug not found',
      );
    }

    return mapPharmacyDrugDetails(
      pharmacyDrug,
    );
  }
}