import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { buildHistoricalDateWindow } from '../utils/historical-date-window.util';

import { getDrugName, getUnitsPerBox } from '../utils/drug-display.util';

type ExpiredBatchIdRow = {
  batchId: number;
};

@Injectable()
export class GetExpiredDrugsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, days: number) {
    const period = buildHistoricalDateWindow(days);

    /*
     * Raw SQL is used only because we need:
     *
     * initial_quantity > sold_quantity
     *
     * This keeps sold-out expired batches
     * out of the result at database level.
     */
    const expiredBatchIds = await this.prisma.$queryRaw<ExpiredBatchIdRow[]>`
        SELECT
          b."batch_id" AS "batchId"

        FROM "batches" b

        INNER JOIN "pharmacy_drugs" pd
          ON pd."pharmacy_drug_id" =
             b."pharmacy_drug_id"

        WHERE
          pd."pharmacy_id" =
            ${pharmacyId}

          AND b."expiry_date"
            IS NOT NULL

          AND b."expiry_date" >=
            ${period.fromDateValue}

          AND b."expiry_date" <=
            ${period.toDateValue}

          AND b."initial_quantity" > 0

        ORDER BY
          b."expiry_date" DESC,
          b."batch_id" DESC
      `;
    //   b."sold_quantity"

    if (expiredBatchIds.length === 0) {
      return {
        days,

        period: {
          fromDate: period.fromDate,

          toDate: period.toDate,
        },

        totalExpiredBatches: 0,
        totalUniqueDrugs: 0,

        items: [],
      };
    }

    const ids = expiredBatchIds.map((item) => item.batchId);

    const batches = await this.prisma.batch.findMany({
      where: {
        batchId: {
          in: ids,
        },
      },

      orderBy: [
        {
          expiryDate: 'desc',
        },
        {
          batchId: 'desc',
        },
      ],

      select: {
        batchId: true,
        pharmacyDrugId: true,
        expiryDate: true,

        initialQuantity: true,
        soldQuantity: true,

        pharmacyDrug: {
          select: {
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
        },
      },
    });

    const uniqueDrugIds = new Set<number>();

    const items = batches.map((batch) => {
      uniqueDrugIds.add(batch.pharmacyDrugId);

      const remainingQuantity = batch.initialQuantity - batch.soldQuantity;

      const unitsPerBox = getUnitsPerBox(batch.pharmacyDrug.drug);

      return {
        batchId: batch.batchId,

        pharmacyDrugId: batch.pharmacyDrugId,

        drugName: getDrugName(batch.pharmacyDrug.drug),

        expiryDate: batch.expiryDate?.toISOString().slice(0, 10) ?? null,

        remainingBaseQuantity:
          unitsPerBox > 0
            ? Math.floor(remainingQuantity / unitsPerBox)
            : remainingQuantity,

        remainingUnits: unitsPerBox > 0 ? remainingQuantity % unitsPerBox : 0,
      };
    });
    return {
      days,

      period: {
        fromDate: period.fromDate,

        toDate: period.toDate,
      },

      /*
       * Same drug can have multiple expired batches.
       */
      totalExpiredBatches: items.length,

      totalUniqueDrugs: uniqueDrugIds.size,

      items,
    };
  }
}
