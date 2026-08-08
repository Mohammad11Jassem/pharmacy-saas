import { AnalyticsLevel } from '../enums/analytics-level.enum';

export type AnalyticsPeriod = {
  fromDate: string;
  toDate: string;

  fromDateKey: number;
  toDateKey: number;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDateKey(value: Date): number {
  return Number(formatDateOnly(value).replaceAll('-', ''));
}

function createPeriod(fromDate: Date, toDate: Date): AnalyticsPeriod {
  return {
    fromDate: formatDateOnly(fromDate),

    toDate: formatDateOnly(toDate),

    fromDateKey: toDateKey(fromDate),

    toDateKey: toDateKey(toDate),
  };
}

export function resolveAnalyticsPeriod(
  date: string,
  level: AnalyticsLevel,
): AnalyticsPeriod {
  const selectedDate = parseDateOnly(date);

  const year = selectedDate.getUTCFullYear();

  const month = selectedDate.getUTCMonth();

  const day = selectedDate.getUTCDate();

  switch (level) {
    case AnalyticsLevel.DAY: {
      return createPeriod(selectedDate, selectedDate);
    }

    case AnalyticsLevel.WEEK: {
      /*
       * Week-of-month:
       *
       * 1  - 7
       * 8  - 14
       * 15 - 21
       * 22 - 28
       * 29 - end of month
       */
      const startDay = Math.floor((day - 1) / 7) * 7 + 1;

      const lastDayOfMonth = new Date(
        Date.UTC(year, month + 1, 0),
      ).getUTCDate();

      const endDay = Math.min(startDay + 6, lastDayOfMonth);

      const fromDate = new Date(Date.UTC(year, month, startDay));

      const toDate = new Date(Date.UTC(year, month, endDay));

      return createPeriod(fromDate, toDate);
    }

    case AnalyticsLevel.MONTH: {
      const fromDate = new Date(Date.UTC(year, month, 1));

      const toDate = new Date(Date.UTC(year, month + 1, 0));

      return createPeriod(fromDate, toDate);
    }

    case AnalyticsLevel.YEAR: {
      const fromDate = new Date(Date.UTC(year, 0, 1));

      const toDate = new Date(Date.UTC(year, 11, 31));

      return createPeriod(fromDate, toDate);
    }
  }
}
