import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { buildHistoricalDateWindow } from '../utils/historical-date-window\.util';

import { getDrugName } from '../utils/drug-display.util';

@Injectable()
export class GetStagnantDrugsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    pharmacyId: number;
    pharmacyKey: number;
    days: number;
  }) {
    const { pharmacyId, pharmacyKey, days } = params;

    const period = buildHistoricalDateWindow(days);

    /*
     * Get only drugs that had sales
     * during the selected period.
     *
     * PostgreSQL performs GROUP BY,
     * so only one row per drug is returned.
     */
    const soldDrugs = await this.prisma.factDrugSalesDaily.groupBy({
      by: ['pharmacyDrugId'],

      where: {
        pharmacyKey,

        dateKey: {
          gte: period.fromDateKey,

          lte: period.toDateKey,
        },

        soldBaseQuantity: {
          gt: 0,
        },
      },
    });

    const soldDrugIds = soldDrugs.map((item) => item.pharmacyDrugId);

    /*
     * Drugs not present in soldDrugIds
     * are stagnant for this period.
     */
    const stagnantDrugs = await this.prisma.pharmacyDrug.findMany({
      where: {
        pharmacyId,
        isActive: true,

        ...(soldDrugIds.length > 0
          ? {
              pharmacyDrugId: {
                notIn: soldDrugIds,
              },
            }
          : {}),
      },

      orderBy: {
        pharmacyDrugId: 'asc',
      },

      select: {
        pharmacyDrugId: true,

        drug: {
          select: {
            generalDrug: {
              select: {
                tradeName: true,
                unitsPerBox: true,
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
      },
    });

    return {
      days,

      period: {
        fromDate: period.fromDate,

        toDate: period.toDate,
      },

      total: stagnantDrugs.length,

      items: stagnantDrugs.map((drug) => ({
        pharmacyDrugId: drug.pharmacyDrugId,

        drugName: getDrugName(drug.drug),
        timeSinceLastSale: days,
      })),
    };
  }
}
