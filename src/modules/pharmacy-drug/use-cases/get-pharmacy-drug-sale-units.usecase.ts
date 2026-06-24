import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BatchStatus,
  DrugSource,
  UnitType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type SaleUnitOption = {
  unitType: UnitType;
  label: string;
  unitFactorToBase: number;
  suggestedUnitPrice: number;
  availableDisplayQuantity: number;
};

@Injectable()
export class GetPharmacyDrugSaleUnitsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, pharmacyDrugId: number) {
    const pharmacyDrug = await this.prisma.pharmacyDrug.findFirst({
      where: {
        pharmacyId,
        pharmacyDrugId,
        isActive: true,
      },
      select: {
        pharmacyDrugId: true,
        sellPart: true,
        consumerPrice: true,
        netPrice: true,

        drug: {
          select: {
            source: true,

            generalDrug: {
              select: {
                tradeName: true,
                unitsPerBox: true,
                consumerPrice: true,
                netPrice: true,
              },
            },

            privateDrug: {
              select: {
                tradeName: true,
                unitsPerBox: true,
              },
            },
          },
        },

        batches: {
          where: {
            status: BatchStatus.ACTIVE,
          },
          select: {
            initialQuantity: true,
            soldQuantity: true,
          },
        },
      },
    });

    if (!pharmacyDrug) {
      throw new NotFoundException('Pharmacy drug not found');
    }

    const drugName =
      pharmacyDrug.drug.source === DrugSource.GENERAL
        ? pharmacyDrug.drug.generalDrug?.tradeName
        : pharmacyDrug.drug.privateDrug?.tradeName;

    const unitsPerBox =
      pharmacyDrug.drug.source === DrugSource.GENERAL
        ? pharmacyDrug.drug.generalDrug?.unitsPerBox
        : pharmacyDrug.drug.privateDrug?.unitsPerBox;

    if (!unitsPerBox || unitsPerBox <= 0) {
      throw new NotFoundException('Drug unitsPerBox is not configured');
    }

    const boxPrice = this.resolveBoxPrice(pharmacyDrug);

    const availableBaseQuantity = pharmacyDrug.batches.reduce(
      (sum, batch) => sum + (batch.initialQuantity - batch.soldQuantity),
      0,
    );

    const saleUnits: SaleUnitOption[] = [
      {
        unitType: UnitType.BOX,
        label: 'علبة',
        unitFactorToBase: unitsPerBox,
        suggestedUnitPrice: boxPrice,
        availableDisplayQuantity: Math.floor(
          availableBaseQuantity / unitsPerBox,
        ),
      },
    ];

    if (pharmacyDrug.sellPart) {
      saleUnits.push({
        unitType: UnitType.STRIP,
        label: 'ظرف',
        unitFactorToBase: 1,
        suggestedUnitPrice: this.roundMoney(boxPrice / unitsPerBox),
        availableDisplayQuantity: availableBaseQuantity,
      });
    }

    return {
      pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
      drugName,
      baseUnit: UnitType.STRIP,
      unitsPerBox,
      sellPart: pharmacyDrug.sellPart,
      availableBaseQuantity,
      saleUnits,
    };
  }

  private resolveBoxPrice(pharmacyDrug: {
    consumerPrice: unknown;
    drug: {
      source: DrugSource;
      generalDrug?: {
        consumerPrice: unknown;
      } | null;
    };
  }): number {
    /**
     * الأفضل أن نعتمد سعر الصيدلية أولًا،
     * وإذا لم يكن موجودًا نأخذ السعر العام للدواء.
     */
    const pharmacyPrice =
      pharmacyDrug.consumerPrice !== null &&
      pharmacyDrug.consumerPrice !== undefined
        ? Number(pharmacyDrug.consumerPrice)
        : null;

    if (pharmacyPrice !== null) {
      return this.roundMoney(pharmacyPrice);
    }

    if (
      pharmacyDrug.drug.source === DrugSource.GENERAL &&
      pharmacyDrug.drug.generalDrug?.consumerPrice !== undefined
    ) {
      return this.roundMoney(
        Number(pharmacyDrug.drug.generalDrug.consumerPrice),
      );
    }

    return 0;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
