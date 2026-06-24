import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BatchStatus,
  DrugSource,
  Prisma,
  UnitType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListAvailableBatchesQueryDto } from '../dto/list-available-batches-query.dto';

type PharmacyDrugBatchContext = {
  pharmacyDrugId: number;
  sellPart: boolean;
  drug: {
    source: DrugSource;
    generalDrug: {
      unitsPerBox: number;
      isActive: boolean;
    } | null;
    privateDrug: {
      unitsPerBox: number;
      isActive: boolean;
    } | null;
  };
};

type AvailableBatchRow = {
  batchId: number;
  pharmacyDrugId: number;
  expiryDate: Date | null;
  receivedDate: Date | null;
  initialQuantity: number;
  soldQuantity: number;
  availableBaseQuantity: number;
  status: BatchStatus;
  createdAt: Date;
};

@Injectable()
export class ListAvailableBatchesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    pharmacyDrugId: number,
    query: ListAvailableBatchesQueryDto,
  ) {
    const pharmacyDrug = await this.findPharmacyDrugOrThrow(
      pharmacyId,
      pharmacyDrugId,
    );

    const unitsPerBox = this.resolveUnitsPerBox(pharmacyDrug);

    if (query.unitType) {
      this.assertUnitTypeIsSupported(pharmacyDrug, query.unitType);
    }

    const batches = await this.loadAvailableBatches(
      pharmacyId,
      pharmacyDrugId,
    );

    return {
      pharmacyDrugId,
      unitType: query.unitType ?? null,
      unitsPerBox,
      sellPart: pharmacyDrug.sellPart,

      batches: batches.map((batch, index) => {
        const availableBaseQuantity = Number(batch.availableBaseQuantity);

        return {
          order: index + 1,
          batchId: batch.batchId,
          expiryDate: batch.expiryDate,
          receivedDate: batch.receivedDate,

          initialQuantity: Number(batch.initialQuantity),
          soldQuantity: Number(batch.soldQuantity),

          /**
           * الكمية المتاحة بالوحدة الأساسية للمخزون.
           * عندك حالياً غالباً STRIP هي الوحدة الأساسية.
           */
          availableBaseQuantity,

          /**
           * الكمية المتاحة حسب الوحدة التي اختارها الفرونت.
           * إذا unitType=BOX نرجع عدد العلب الممكن بيعها.
           * إذا unitType=STRIP نرجع عدد الشرائط.
           */
          availableDisplayQuantity: query.unitType
            ? this.resolveAvailableDisplayQuantity(
                availableBaseQuantity,
                query.unitType,
                unitsPerBox,
              )
            : null,

          status: batch.status,
        };
      }),
    };
  }

  private async findPharmacyDrugOrThrow(
    pharmacyId: number,
    pharmacyDrugId: number,
  ): Promise<PharmacyDrugBatchContext> {
    const pharmacyDrug = await this.prisma.pharmacyDrug.findFirst({
      where: {
        pharmacyId,
        pharmacyDrugId,
        isActive: true,
      },
      select: {
        pharmacyDrugId: true,
        sellPart: true,
        drug: {
          select: {
            source: true,
            generalDrug: {
              select: {
                unitsPerBox: true,
                isActive: true,
              },
            },
            privateDrug: {
              select: {
                unitsPerBox: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!pharmacyDrug) {
      throw new NotFoundException('Pharmacy drug not found');
    }

    if (pharmacyDrug.drug.source === DrugSource.GENERAL) {
      if (!pharmacyDrug.drug.generalDrug) {
        throw new BadRequestException(
          `General drug data not found for pharmacyDrugId ${pharmacyDrugId}`,
        );
      }

      if (!pharmacyDrug.drug.generalDrug.isActive) {
        throw new BadRequestException(
          `Drug is inactive for pharmacyDrugId ${pharmacyDrugId}`,
        );
      }
    }

    if (pharmacyDrug.drug.source === DrugSource.PRIVATE) {
      if (!pharmacyDrug.drug.privateDrug) {
        throw new BadRequestException(
          `Private drug data not found for pharmacyDrugId ${pharmacyDrugId}`,
        );
      }

      if (!pharmacyDrug.drug.privateDrug.isActive) {
        throw new BadRequestException(
          `Drug is inactive for pharmacyDrugId ${pharmacyDrugId}`,
        );
      }
    }

    return pharmacyDrug;
  }

  private async loadAvailableBatches(
    pharmacyId: number,
    pharmacyDrugId: number,
  ): Promise<AvailableBatchRow[]> {
    return this.prisma.$queryRaw<AvailableBatchRow[]>(Prisma.sql`
      SELECT
        b."batch_id" AS "batchId",
        b."pharmacy_drug_id" AS "pharmacyDrugId",
        b."expiry_date" AS "expiryDate",
        b."received_date" AS "receivedDate",
        b."initial_quantity" AS "initialQuantity",
        b."sold_quantity" AS "soldQuantity",
        b."initial_quantity" - b."sold_quantity" AS "availableBaseQuantity",
        b."status" AS "status",
        b."created_at" AS "createdAt"
      FROM "batches" b
      INNER JOIN "pharmacy_drugs" pd
        ON pd."pharmacy_drug_id" = b."pharmacy_drug_id"
      WHERE
        pd."pharmacy_id" = ${pharmacyId}
        AND b."pharmacy_drug_id" = ${pharmacyDrugId}
        AND b."status" = 'ACTIVE'::"BatchStatus"
        AND (b."initial_quantity" - b."sold_quantity") > 0
      ORDER BY
        b."expiry_date" ASC NULLS LAST,
        b."created_at" ASC,
        b."batch_id" ASC
    `);
  }

  private resolveUnitsPerBox(pharmacyDrug: PharmacyDrugBatchContext): number {
    const unitsPerBox =
      pharmacyDrug.drug.source === DrugSource.GENERAL
        ? pharmacyDrug.drug.generalDrug?.unitsPerBox
        : pharmacyDrug.drug.privateDrug?.unitsPerBox;

    if (!unitsPerBox || unitsPerBox <= 0) {
      throw new BadRequestException(
        `unitsPerBox is not configured for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
      );
    }

    return unitsPerBox;
  }

  private assertUnitTypeIsSupported(
    pharmacyDrug: PharmacyDrugBatchContext,
    unitType: UnitType,
  ): void {
    switch (unitType) {
      case UnitType.BOX:
        return;

      case UnitType.STRIP:
        if (!pharmacyDrug.sellPart) {
          throw new BadRequestException(
            `pharmacyDrugId ${pharmacyDrug.pharmacyDrugId} cannot be sold as STRIP`,
          );
        }

        return;

      case UnitType.TABLET:
        throw new BadRequestException('TABLET sale is not supported yet');

      default:
        throw new BadRequestException(`Unsupported unitType ${unitType}`);
    }
  }

  private resolveAvailableDisplayQuantity(
    availableBaseQuantity: number,
    unitType: UnitType,
    unitsPerBox: number,
  ): number {
    switch (unitType) {
      case UnitType.BOX:
        return Math.floor(availableBaseQuantity / unitsPerBox);

      case UnitType.STRIP:
        return availableBaseQuantity;

      case UnitType.TABLET:
        throw new BadRequestException('TABLET sale is not supported yet');

      default:
        throw new BadRequestException(`Unsupported unitType ${unitType}`);
    }
  }
}