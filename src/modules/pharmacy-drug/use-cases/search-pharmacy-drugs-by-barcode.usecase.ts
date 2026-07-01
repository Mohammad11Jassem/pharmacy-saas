import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildSearchPharmacyDrugSelect,
  mapGeneralDrugForSearch,
  mapPharmacyDrugForSearch,
  searchGeneralDrugSelect,
} from '../mappers/search-pharmacy-drug.mapper';

@Injectable()
export class SearchPharmacyDrugsByBarcodeUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(pharmacyId: number, barcode: string) {
    const normalizedBarcode = barcode?.trim();

    if (!normalizedBarcode) {
      throw new BadRequestException('Barcode is required');
    }

    // set the time to 00:00:00 to compare only the date part
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pharmacyDrug, generalDrug] =
      await Promise.all([
        this.prisma.pharmacyDrug.findFirst({
          where: {
            pharmacyId,

            OR: [
              {
                drug: {
                  generalDrug: {
                    is: {
                      barcode: normalizedBarcode,
                    },
                  },
                },
              },
              {
                drug: {
                  privateDrug: {
                    is: {
                      barcode: normalizedBarcode,
                    },
                  },
                },
              },
            ],
          },

          orderBy: {
            createdAt: 'desc',
          },

          select: buildSearchPharmacyDrugSelect(today),
        }),

        this.prisma.generalDrug.findUnique({
          where: {
            barcode: normalizedBarcode,
          },

          select: searchGeneralDrugSelect,
        }),
      ]);

    return {
      pharmacyDrug: pharmacyDrug
        ? mapPharmacyDrugForSearch(pharmacyDrug)
        : null,

      generalDrug: generalDrug
        ? mapGeneralDrugForSearch(generalDrug)
        : null,
    };
  }
}