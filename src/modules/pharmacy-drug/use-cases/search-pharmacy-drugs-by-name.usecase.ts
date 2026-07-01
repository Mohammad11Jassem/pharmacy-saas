import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchPharmacyDrugByNameDto } from '../dto/search-pharmacy-drug-by-name.dto';
import {
  buildSearchPharmacyDrugSelect,
  mapGeneralDrugForSearch,
  mapPharmacyDrugForSearch,
  searchGeneralDrugSelect,
} from '../mappers/search-pharmacy-drug.mapper';
@Injectable()
export class SearchPharmacyDrugsByNameUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, dto: SearchPharmacyDrugByNameDto) {
    const normalizedName = dto.name?.trim();

    if (!normalizedName) {
      throw new BadRequestException('Drug name is required');
    }

    const page = Math.max(Number(dto.page) || 1, 1);

    const limit = Math.min(Math.max(Number(dto.limit) || 20, 1), 100);

    const skip = (page - 1) * limit;

    const pharmacyDrugWhere: Prisma.PharmacyDrugWhereInput = {
      pharmacyId,

      OR: [
        {
          drug: {
            generalDrug: {
              is: {
                tradeName: {
                  contains: normalizedName,
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
                  contains: normalizedName,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    };

    const generalDrugWhere: Prisma.GeneralDrugWhereInput = {
      tradeName: {
        contains: normalizedName,
        mode: 'insensitive',
      },
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [pharmacyDrugs, totalPharmacyDrugs, generalDrugs, totalGeneralDrugs] =
      await Promise.all([
        this.prisma.pharmacyDrug.findMany({
          where: pharmacyDrugWhere,

          skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },

          select: buildSearchPharmacyDrugSelect(today),
        }),

        this.prisma.pharmacyDrug.count({
          where: pharmacyDrugWhere,
        }),

        this.prisma.generalDrug.findMany({
          where: generalDrugWhere,

          skip,
          take: limit,

          orderBy: {
            tradeName: 'asc',
          },

          select: searchGeneralDrugSelect,
        }),

        this.prisma.generalDrug.count({
          where: generalDrugWhere,
        }),
      ]);

    return {
      pharmacyDrugs: this.buildPaginatedResponse(
        pharmacyDrugs.map(mapPharmacyDrugForSearch),
        totalPharmacyDrugs,
        page,
        limit,
      ),

      generalDrugs: this.buildPaginatedResponse(
        generalDrugs.map(mapGeneralDrugForSearch),
        totalGeneralDrugs,
        page,
        limit,
      ),
    };
  }

  private buildPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const pages = Math.ceil(total / limit);

    return {
      items,

      page,
      limit,

      total,
      pages,

      hasNextPage: page < pages,
      hasPreviousPage: page > 1,
    };
  }
}
