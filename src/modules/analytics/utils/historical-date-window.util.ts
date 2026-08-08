const ANALYTICS_TIME_ZONE = 'Asia/Damascus';

export type HistoricalDateWindow = {
  fromDate: string;
  toDate: string;

  fromDateKey: number;
  toDateKey: number;

  fromDateValue: Date;
  toDateValue: Date;
};

function getDateOnlyInTimeZone(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ANALYTICS_TIME_ZONE,

    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;

  const month = parts.find((part) => part.type === 'month')?.value;

  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDateKey(value: string): number {
  return Number(value.replaceAll('-', ''));
}

export function buildHistoricalDateWindow(days: number): HistoricalDateWindow {
  const today = getDateOnlyInTimeZone(new Date());

  const toDateValue = parseDateOnly(today);

  /*
   * 30 days means:
   * today + previous 29 days.
   */
  const fromDateValue = addDays(toDateValue, -(days - 1));

  const fromDate = formatDateOnly(fromDateValue);

  const toDate = formatDateOnly(toDateValue);

  return {
    fromDate,
    toDate,

    fromDateKey: toDateKey(fromDate),

    toDateKey: toDateKey(toDate),

    fromDateValue,
    toDateValue,
  };
}
