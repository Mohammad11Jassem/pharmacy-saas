import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { AnalyticsLevel } from '../enums/analytics-level.enum';

import { AnalyticsPeriod } from '../utils/analytics-period.util';

type TrendBucket = {
  key: string;

  label: string;

  referenceDate: string;

  fromDate: string;
  toDate: string;

  grossSalesAmount: number;
};

@Injectable()
export class GetSalesTrendUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    pharmacyKey: number;
    level: AnalyticsLevel;
    period: AnalyticsPeriod;
  }) {
    const { pharmacyKey, level, period } = params;

    /*
     * Read all calendar dates in the requested period.
     *
     * The relation may contain zero or one daily fact
     * for this pharmacy.
     *
     * Using dim_date also allows zero-sales dates
     * to appear correctly in the chart.
     */
    const rows = await this.prisma.dimDate.findMany({
      where: {
        dateKey: {
          gte: period.fromDateKey,

          lte: period.toDateKey,
        },
      },

      orderBy: {
        dateKey: 'asc',
      },

      select: {
        dateKey: true,
        fullDate: true,

        dayOfMonth: true,
        monthNumber: true,
        yearNumber: true,

        billsDaily: {
          where: {
            pharmacyKey,
          },

          select: {
            grossSalesAmount: true,
          },
        },
      },
    });

    switch (level) {
      case AnalyticsLevel.YEAR:
        return this.buildYearTrend(rows, period);

      case AnalyticsLevel.MONTH:
        return this.buildMonthTrend(rows, period);

      case AnalyticsLevel.WEEK:
        return this.buildWeekTrend(rows, period);

      case AnalyticsLevel.DAY:
        return this.buildDayTrend(rows, period);
    }
  }

  private buildYearTrend(rows: Array<any>, period: AnalyticsPeriod) {
    const buckets = new Map<number, TrendBucket>();

    for (const row of rows) {
      const month = row.monthNumber;

      const gross = this.getGrossSales(row);

      const existing = buckets.get(month);

      if (!existing) {
        const date = this.formatDate(row.fullDate);

        buckets.set(month, {
          key: `${row.yearNumber}-${String(month).padStart(2, '0')}`,

          label: this.getMonthLabel(month),

          referenceDate: date,

          fromDate: date,

          toDate: date,

          grossSalesAmount: gross,
        });

        continue;
      }

      existing.grossSalesAmount += gross;

      existing.toDate = this.formatDate(row.fullDate);
    }

    return {
      level: AnalyticsLevel.YEAR,

      bucketLevel: AnalyticsLevel.MONTH,

      period,

      items: Array.from(buckets.values()),
    };
  }

  private buildMonthTrend(rows: Array<any>, period: AnalyticsPeriod) {
    const buckets = new Map<number, TrendBucket>();

    for (const row of rows) {
      /*
       * 1-7   => week 1
       * 8-14  => week 2
       * etc.
       */
      const weekOfMonth = Math.floor((row.dayOfMonth - 1) / 7) + 1;

      const gross = this.getGrossSales(row);

      const date = this.formatDate(row.fullDate);

      const existing = buckets.get(weekOfMonth);

      if (!existing) {
        buckets.set(weekOfMonth, {
          key: `WEEK_${weekOfMonth}`,

          label: `Week ${weekOfMonth}`,

          referenceDate: date,

          fromDate: date,

          toDate: date,

          grossSalesAmount: gross,
        });

        continue;
      }

      existing.grossSalesAmount += gross;

      existing.toDate = date;
    }

    return {
      level: AnalyticsLevel.MONTH,

      bucketLevel: AnalyticsLevel.WEEK,

      period,

      items: Array.from(buckets.values()),
    };
  }

  private buildWeekTrend(rows: Array<any>, period: AnalyticsPeriod) {
    const items = rows.map((row): TrendBucket => {
      const date = this.formatDate(row.fullDate);

      return {
        key: date,

        label: this.getDayLabel(row.fullDate),

        referenceDate: date,

        fromDate: date,

        toDate: date,

        grossSalesAmount: this.getGrossSales(row),
      };
    });

    return {
      level: AnalyticsLevel.WEEK,

      bucketLevel: AnalyticsLevel.DAY,

      period,

      items,
    };
  }

  private buildDayTrend(rows: Array<any>, period: AnalyticsPeriod) {
    const items = rows.map((row): TrendBucket => {
      const date = this.formatDate(row.fullDate);

      return {
        key: date,

        label: this.getDayLabel(row.fullDate),

        referenceDate: date,

        fromDate: date,

        toDate: date,

        grossSalesAmount: this.getGrossSales(row),
      };
    });

    return {
      level: AnalyticsLevel.DAY,

    //   bucketLevel: null,

      period,

      items,
    };
  }

  private getGrossSales(row: {
    billsDaily: Array<{
      grossSalesAmount: unknown;
    }>;
  }): number {
    const fact = row.billsDaily[0];

    if (!fact) {
      return 0;
    }

    return Number(fact.grossSalesAmount);
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private getDayLabel(value: Date): string {
    return new Intl.DateTimeFormat('ar-SY', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(value);
  }

  private getMonthLabel(month: number): string {
    const date = new Date(Date.UTC(2026, month - 1, 1));

    return new Intl.DateTimeFormat('ar-SY', {
      month: 'long',
      timeZone: 'UTC',
    }).format(date);
  }
}
