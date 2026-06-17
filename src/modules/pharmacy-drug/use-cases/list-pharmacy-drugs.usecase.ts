import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListPharmacyDrugsDto } from '../dto/list-pharmacy-drugs.dto';
import { mapPharmacyDrug } from '../mappers/list-pharmacy-drug.mapper.ts';
;

@Injectable()
export class ListPharmacyDrugsUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    dto: ListPharmacyDrugsDto,
  ) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PharmacyDrugWhereInput = {
      pharmacyId,
    };

    if (dto.source) {
      where.drug = {
        source: dto.source,
      };
    }

    if (dto.name) {
      where.OR = [
        {
          drug: {
            generalDrug: {
              is: {
                tradeName: {
                  contains: dto.name,
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
                  contains: dto.name,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ];
    }

    const [pharmacyDrugs, totalItems] =
      await Promise.all([
        this.prisma.pharmacyDrug.findMany({
          where,

          skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },

          select: {
            pharmacyDrugId: true,
            pharmacyId: true,
            drugId: true,

            minStockAlert: true,
            sellPart: true,
            netPrice: true,
            consumerPrice: true,
            expiryDateAlarm: true,
            isActive: true,
            notes: true,

            createdAt: true,
            updatedAt: true,

            drugLocations: {
              select: {
                drugLocationId: true,
                storageLocation: true,
              },
            },

            batches: {
              select: {
                batchId: true,
                initialQuantity: true,
                soldQuantity: true,
                expiryDate: true,
                receivedDate: true,
              },
            },

            drug: {
              select: {
                source: true,

                generalDrug: {
                  select: {
                    generalDrugId: true,
                    tradeName: true,
                    barcode: true,
                    unitsPerBox: true,
                    netPrice: true,
                    consumerPrice: true,
                    isRx: true,
                    isActive: true,

                    dosageForm: {
                      select: {
                        dosageFormId: true,
                        dosageFormName: true,
                        formCategory: true,
                      },
                    },

                    ingredients: {
                      select: {
                        drugIngredientId: true,
                        strengthValue: true,
                        unit: true,

                        ingredient: {
                          select: {
                            ingredientId: true,
                            ingredientName: true,
                          },
                        },
                      },
                    },

                    categories: {
                      select: {
                        uniqueId: true,

                        category: {
                          select: {
                            categoryId: true,
                            categoryName: true,
                          },
                        },
                      },
                    },
                  },
                },

                privateDrug: {
                  select: {
                    privateDrugId: true,
                    tradeName: true,
                    barcode: true,
                    unitsPerBox: true,
                    isRx: true,
                    isActive: true,

                    dosageForm: {
                      select: {
                        dosageFormId: true,
                        dosageFormName: true,
                        formCategory: true,
                      },
                    },
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

    const mappedPharmacyDrugs =
      pharmacyDrugs.map(mapPharmacyDrug);

    const pages =
      Math.ceil(totalItems / limit);

    return {
      pharmacyDrugs:
        mappedPharmacyDrugs,

      page,
      limit,
      total:
        totalItems,

      pages,

      hasNextPage:
        page < pages,

      hasPreviousPage:
        page > 1,
    };
  }
}