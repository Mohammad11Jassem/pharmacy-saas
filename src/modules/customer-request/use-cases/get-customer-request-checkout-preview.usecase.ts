import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerRequestStatus,
  DrugSource,
  Prisma,
  UnitType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveLargestSaleUnit } from '../../../common/sale-units/largest-sale-unit.util';

type AvailableStockRow = {
  pharmacyDrugId: number;
  availableBaseQuantity: number;
};

type PreviewDrugData = {
  tradeName: string;
  unitsPerBox: number;
  boxPrice: number;
  isDrugActive: boolean;
};

@Injectable()
export class GetCustomerRequestCheckoutPreviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, customerRequestId: number) {
    const request = await this.prisma.customerRequest.findFirst({
      where: {
        customerRequestId,
        pharmacyId,
      },
      select: {
        customerRequestId: true,
        customerName: true,
        customerPhone: true,
        notes: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        cancelledAt: true,
        items: {
          orderBy: {
            customerRequestItemId: 'asc',
          },
          select: {
            customerRequestItemId: true,
            pharmacyDrugId: true,
            requestedQuantity: true,
            fulfilledQuantity: true,
            status: true,
            notes: true,
            pharmacyDrug: {
              select: {
                pharmacyDrugId: true,
                isActive: true,
                sellPart: true,
                consumerPrice: true,
                drug: {
                  select: {
                    source: true,
                    generalDrug: {
                      select: {
                        tradeName: true,
                        unitsPerBox: true,
                        consumerPrice: true,
                        isActive: true,
                      },
                    },
                    privateDrug: {
                      select: {
                        tradeName: true,
                        unitsPerBox: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Customer request not found');
    }

    this.assertRequestCanBeCheckedOut(request.status);

    if (request.items.length === 0) {
      throw new BadRequestException('Customer request has no items');
    }

    const pharmacyDrugIds = request.items.map((item) => item.pharmacyDrugId);

    const availableStockByDrugId = await this.loadAvailableStockByDrugId(
      pharmacyId,
      pharmacyDrugIds,
    );

    const items = request.items.map((item) => {
      const pharmacyDrug = item.pharmacyDrug;
      const drugData = this.resolveDrugData(pharmacyDrug);

      if (!pharmacyDrug.isActive) {
        throw new ConflictException(
          `pharmacyDrugId ${item.pharmacyDrugId} is inactive`,
        );
      }

      if (!drugData.isDrugActive) {
        throw new ConflictException(
          `Drug is inactive for pharmacyDrugId ${item.pharmacyDrugId}`,
        );
      }

      const largestSaleUnit = resolveLargestSaleUnit(
        drugData.unitsPerBox,
        pharmacyDrug.sellPart,
      );

      const availableBaseQuantity =
        availableStockByDrugId.get(item.pharmacyDrugId) ?? 0;

      const availableQuantity = Math.floor(
        availableBaseQuantity / largestSaleUnit.unitFactorToBase,
      );

      const remainingQuantity = Math.max(
        item.requestedQuantity - item.fulfilledQuantity,
        0,
      );

      const suggestedSaleQuantity = Math.min(
        remainingQuantity,
        availableQuantity,
      );

      const suggestedUnitPrice = this.resolveSuggestedUnitPrice(
        drugData.boxPrice,
        largestSaleUnit.unitType,
        drugData.unitsPerBox,
      );

      return {
        customerRequestItemId: item.customerRequestItemId,
        pharmacyDrugId: item.pharmacyDrugId,
        tradeName: drugData.tradeName,

        unitType: largestSaleUnit.unitType,
        unitLabel: largestSaleUnit.unitLabel,
        unitFactorToBase: largestSaleUnit.unitFactorToBase,

        requestedQuantity: item.requestedQuantity,
        fulfilledQuantity: item.fulfilledQuantity,
        remainingQuantity,

        availableBaseQuantity,
        availableQuantity,
        suggestedSaleQuantity,

        suggestedUnitPrice,
        canFulfillCompletely: availableQuantity >= remainingQuantity,
        hasAvailableStock: availableQuantity > 0,

        status: item.status,
        notes: item.notes,
      };
    });

    const actionableItems = items.filter((item) => item.remainingQuantity > 0);

    return {
      customerRequestId: request.customerRequestId,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      notes: request.notes,
      status: request.status,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      cancelledAt: request.cancelledAt,

      canFulfillCompletely: actionableItems.every(
        (item) => item.canFulfillCompletely,
      ),

      // The pharmacist may sell more or less than the requested quantity,
      // so any available item can be used in the sale form.
      canCreateSaleInvoice: items.some((item) => item.hasAvailableStock),

      items,
    };
  }

  private assertRequestCanBeCheckedOut(status: CustomerRequestStatus): void {
    if (status === CustomerRequestStatus.CANCELLED) {
      throw new ConflictException(
        'Cancelled customer request cannot be checked out',
      );
    }

    if (status === CustomerRequestStatus.COMPLETED) {
      throw new ConflictException('Customer request is already completed');
    }
  }

  private async loadAvailableStockByDrugId(
    pharmacyId: number,
    pharmacyDrugIds: number[],
  ): Promise<Map<number, number>> {
    const uniquePharmacyDrugIds = [...new Set(pharmacyDrugIds)].sort(
      (a, b) => a - b,
    );

    if (uniquePharmacyDrugIds.length === 0) {
      return new Map<number, number>();
    }

    /**
     * This intentionally matches the sale posting stock policy:
     * - same pharmacy
     * - ACTIVE batches only
     * - expiry date is today or later
     * - null expiry dates are not considered sellable
     */
    const rows = await this.prisma.$queryRaw<AvailableStockRow[]>(Prisma.sql`
      SELECT
        b."pharmacy_drug_id" AS "pharmacyDrugId",
        COALESCE(
          SUM(
            GREATEST(
              b."initial_quantity" - b."sold_quantity",
              0
            )
          ),
          0
        )::int AS "availableBaseQuantity"
      FROM "batches" b
      INNER JOIN "pharmacy_drugs" pd
        ON pd."pharmacy_drug_id" = b."pharmacy_drug_id"
      WHERE
        pd."pharmacy_id" = ${pharmacyId}
        AND b."pharmacy_drug_id" IN (${Prisma.join(
          uniquePharmacyDrugIds,
        )})
        AND b."status" = 'ACTIVE'
        AND b."expiry_date" >= CURRENT_DATE
      GROUP BY b."pharmacy_drug_id"
    `);

    return new Map(
      rows.map((row) => [
        Number(row.pharmacyDrugId),
        Number(row.availableBaseQuantity),
      ]),
    );
  }

  private resolveDrugData(pharmacyDrug: {
    consumerPrice: Prisma.Decimal | null;
    drug: {
      source: DrugSource;
      generalDrug: {
        tradeName: string;
        unitsPerBox: number;
        consumerPrice: Prisma.Decimal;
        isActive: boolean;
      } | null;
      privateDrug: {
        tradeName: string;
        unitsPerBox: number;
        isActive: boolean;
      } | null;
    };
  }): PreviewDrugData {
    if (pharmacyDrug.drug.source === DrugSource.GENERAL) {
      const generalDrug = pharmacyDrug.drug.generalDrug;

      if (!generalDrug) {
        throw new BadRequestException('General drug data is missing');
      }

      return {
        tradeName: generalDrug.tradeName,
        unitsPerBox: this.assertValidUnitsPerBox(generalDrug.unitsPerBox),
        boxPrice: this.resolveBoxPrice(
          pharmacyDrug.consumerPrice,
          generalDrug.consumerPrice,
        ),
        isDrugActive: generalDrug.isActive,
      };
    }

    const privateDrug = pharmacyDrug.drug.privateDrug;

    if (!privateDrug) {
      throw new BadRequestException('Private drug data is missing');
    }

    return {
      tradeName: privateDrug.tradeName,
      unitsPerBox: this.assertValidUnitsPerBox(privateDrug.unitsPerBox),
      boxPrice: this.resolveBoxPrice(pharmacyDrug.consumerPrice, null),
      isDrugActive: privateDrug.isActive,
    };
  }

  private assertValidUnitsPerBox(unitsPerBox: number): number {
    if (!Number.isInteger(unitsPerBox) || unitsPerBox <= 0) {
      throw new BadRequestException('Drug unitsPerBox is not configured');
    }

    return unitsPerBox;
  }

  private resolveBoxPrice(
    pharmacySpecificPrice: Prisma.Decimal | null,
    generalDrugPrice: Prisma.Decimal | null,
  ): number {
    const pharmacyPrice =
      pharmacySpecificPrice === null ? null : Number(pharmacySpecificPrice);

    if (pharmacyPrice !== null && pharmacyPrice > 0) {
      return this.roundMoney(pharmacyPrice);
    }

    const generalPrice =
      generalDrugPrice === null ? null : Number(generalDrugPrice);

    if (generalPrice !== null && generalPrice > 0) {
      return this.roundMoney(generalPrice);
    }

    throw new BadRequestException('Drug consumer price is not configured');
  }

  private resolveSuggestedUnitPrice(
    boxPrice: number,
    unitType: UnitType,
    unitsPerBox: number,
  ): number {
    if (unitType === UnitType.BOX) {
      return boxPrice;
    }

    if (unitType === UnitType.STRIP) {
      return this.roundMoney(boxPrice / unitsPerBox);
    }

    throw new BadRequestException(`Unsupported unitType ${unitType}`);
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
