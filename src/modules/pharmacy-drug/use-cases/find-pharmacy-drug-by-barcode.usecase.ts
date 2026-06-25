import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FindPharmacyDrugByBarcodeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, barcode: string) {
    const normalizedBarcode = barcode?.trim();

    if (!normalizedBarcode) {
      throw new BadRequestException('Barcode is required');
    }

    const pharmacyDrug = await this.prisma.pharmacyDrug.findFirst({
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
    });

    if (!pharmacyDrug) {
      throw new NotFoundException('Pharmacy drug not found by barcode');
    }

    return {
      pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
      tradeName:
        pharmacyDrug.drug.generalDrug?.tradeName ??
        pharmacyDrug.drug.privateDrug?.tradeName,
    };
  }
}