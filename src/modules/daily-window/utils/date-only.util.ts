export const APP_TIME_ZONE = 'Asia/Damascus';

const DATE_ONLY_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert YYYY-MM-DD to a Date suitable for PostgreSQL DATE fields.
 */
export function parseDateOnly(
  value: string,
): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error(
      'Date must use YYYY-MM-DD format.',
    );
  }

  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * Return the local calendar date in the application time zone.
 */
export function getDateOnlyInTimeZone(
  date: Date = new Date(),
): string {
  const formatter =
    new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  const parts =
    formatter.formatToParts(date);

  const year =
    parts.find((part) => part.type === 'year')
      ?.value;

  const month =
    parts.find((part) => part.type === 'month')
      ?.value;

  const day =
    parts.find((part) => part.type === 'day')
      ?.value;

  if (!year || !month || !day) {
    throw new Error(
      'Unable to resolve the local date.',
    );
  }

  return `${year}-${month}-${day}`;
}

/**
 * Add whole days without changing the clock time.
 */
export function addDays(
  date: Date,
  days: number,
): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days,
  );

  return result;
}

/**
 * Calculate the difference between two DATE values.
 */
export function differenceInDays(
  from: Date,
  to: Date,
): number {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (to.getTime() - from.getTime()) /
      millisecondsPerDay,
  );
}