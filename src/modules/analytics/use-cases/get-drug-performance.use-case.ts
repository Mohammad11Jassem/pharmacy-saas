import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { buildHistoricalDateWindow } from '../utils/historical-date-window.util';

import { getDrugName, getUnitsPerBox } from '../utils/drug-display.util';

type RankedDrugRow = {
  pharmacyDrugId: number;

  soldBaseQuantity: number;

  topRank: number;
  lowRank: number;
};

@Injectable()
export class GetDrugPerformanceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    pharmacyId: number;
    pharmacyKey: number;

    days: number;
    limit: number;
  }) {
    const { pharmacyId, pharmacyKey, days, limit } = params;

    const period = buildHistoricalDateWindow(days);

    /*
     * Aggregate once, then rank the same
     * result as highest and lowest sales.
     */
    const rows = await this.prisma.$queryRaw<RankedDrugRow[]>`
        WITH drug_totals AS (
          SELECT
            f."pharmacy_drug_id",

            SUM(
              f."sold_base_quantity"
            )::integer
              AS "soldBaseQuantity"

          FROM "fact_drug_sales_daily" f

          WHERE
            f."pharmacy_key" =
              ${pharmacyKey}

            AND f."date_key"
              BETWEEN
                ${period.fromDateKey}
                AND
                ${period.toDateKey}

          GROUP BY
            f."pharmacy_drug_id"

          HAVING
            SUM(
              f."sold_base_quantity"
            ) > 0
        ),

        ranked AS (
          SELECT
            "pharmacy_drug_id",
            "soldBaseQuantity",

            (
              ROW_NUMBER() OVER (
                ORDER BY
                  "soldBaseQuantity" DESC,
                  "pharmacy_drug_id" ASC
              )
            )::integer
              AS "topRank",

            (
              ROW_NUMBER() OVER (
                ORDER BY
                  "soldBaseQuantity" ASC,
                  "pharmacy_drug_id" ASC
              )
            )::integer
              AS "lowRank"

          FROM drug_totals
        )

        SELECT
          "pharmacy_drug_id"
            AS "pharmacyDrugId",

          "soldBaseQuantity",

          "topRank",
          "lowRank"

        FROM ranked

        WHERE
          "topRank" <= ${limit}
          OR
          "lowRank" <= ${limit}
      `;

    if (rows.length === 0) {
      return {
        days,

        period: {
          fromDate: period.fromDate,

          toDate: period.toDate,
        },

        topSelling: [],
        leastSelling: [],
      };
    }

    /*
     * Load names and unitsPerBox
     * in one OLTP query.
     *
     * This avoids N+1 queries.
     */
    const pharmacyDrugIds = [
      ...new Set(rows.map((item) => item.pharmacyDrugId)),
    ];

    const drugs = await this.prisma.pharmacyDrug.findMany({
      where: {
        pharmacyId,

        pharmacyDrugId: {
          in: pharmacyDrugIds,
        },
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

    const drugMap = new Map(drugs.map((drug) => [drug.pharmacyDrugId, drug]));

    const mapItem = (row: RankedDrugRow) => {
      const drug = drugMap.get(row.pharmacyDrugId);

      if (!drug) {
        return null;
      }

      const unitsPerBox = getUnitsPerBox(drug.drug);

      return {
        pharmacyDrugId: row.pharmacyDrugId,

        drugName: getDrugName(drug.drug),

        /*
         * Fact quantity is stored
         * in base units.
         */
        // soldBaseQuantity: row.soldBaseQuantity,

        soldFullBoxes: Math.floor(row.soldBaseQuantity / unitsPerBox),

        soldRemainingUnits: row.soldBaseQuantity % unitsPerBox,
      };
    };

    const topSelling = rows
      .filter((item) => item.topRank <= limit)
      .sort((a, b) => a.topRank - b.topRank)
      .map(mapItem)
      .filter((item) => item !== null);

    const leastSelling = rows
      .filter((item) => item.lowRank <= limit)
      .sort((a, b) => a.lowRank - b.lowRank)
      .map(mapItem)
      .filter((item) => item !== null);

    return {
      days,

      period: {
        fromDate: period.fromDate,

        toDate: period.toDate,
      },

      topSelling,
      leastSelling,
    };
  }
}
