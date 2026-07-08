import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';

import { SearchMyPharmacyDrugsByNameDto } from '../dto/search-my-pharmacy-drugs-by-name.dto';

@Injectable()
export class SearchMyPharmacyDrugsByNameUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    dto: SearchMyPharmacyDrugsByNameDto,
  ) {
    // Clean the searched drug name
    const name = dto.name.trim();

    // Prepare pagination values
    const {
      page,
      limit,
      skip,
      take,
    } = getPaginationParams(dto.page, dto.limit);

    // Search only inside the current pharmacy drugs
    const where: Prisma.PharmacyDrugWhereInput = {
      pharmacyId,

      OR: [
        {
          drug: {
            generalDrug: {
              is: {
                tradeName: {
                  contains: name,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          drug: {
            privateDrug: {
              is: {
                tradeName: {
                  contains: name,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    };

    // Get drugs and total count at the same time
    const [pharmacyDrugs, total] = await Promise.all([
      this.prisma.pharmacyDrug.findMany({
        where,

        skip,
        take,

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          pharmacyDrugId: true,

          drug: {
            select: {
              generalDrug: {
                select: {
                  tradeName: true,
                },
              },

              privateDrug: {
                select: {
                  tradeName: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.pharmacyDrug.count({
        where,
      }),
    ]);

    // Return only drug id and drug name
    const items = pharmacyDrugs.map((pharmacyDrug) => ({
      pharmacyDrugId: pharmacyDrug.pharmacyDrugId,

      tradeName:
        pharmacyDrug.drug.generalDrug?.tradeName ??
        pharmacyDrug.drug.privateDrug?.tradeName ??
        null,
    }));

    // Build the paginated response
    return toPaginatedResult(
      items,
      total,
      page,
      limit,
    );
  }
}