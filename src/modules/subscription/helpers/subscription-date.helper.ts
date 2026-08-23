/**
 * All subscription-domain date rules are CALENDAR-DATE based.
 * Hours, minutes, seconds and the server timezone must never affect
 * subscription activation, expiry, offers, or private offer grants.
 *
 * The business operates on the Damascus calendar day even when the
 * application server/container itself runs in UTC.
 */
export const SUBSCRIPTION_BUSINESS_TIME_ZONE = 'Asia/Damascus';

/**
 * Convert a date-like value to a canonical date-only Date.
 *
 * We store date-only values as UTC midnight only as a persistence
 * representation. UTC here is NOT the business timezone; the actual
 * business rule is based only on YYYY-MM-DD.
 *
 * For strings, the literal YYYY-MM-DD part is intentionally used.
 * Therefore both values below represent the same business date:
 *   2026-08-23
 *   2026-08-23T09:05:00.000Z
 */
export function toDateOnly(value: Date | string): Date {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (!match) {
      throw new Error('Invalid calendar date.');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    return createUtcDateOnly(year, month, day);
  }

  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid calendar date.');
  }

  return createUtcDateOnly(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
  );
}

/**
 * Return today's CALENDAR DATE in the subscription business timezone.
 * Example:
 *   UTC now      = 2026-08-22T23:30:00Z
 *   Damascus day = 2026-08-23
 *   result       = 2026-08-23T00:00:00.000Z (canonical representation)
 */
export function getSubscriptionToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SUBSCRIPTION_BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return createUtcDateOnly(year, month, day);
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = toDateOnly(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function compareCalendarDates(
  left: Date | string,
  right: Date | string,
): number {
  return toDateOnly(left).getTime() - toDateOnly(right).getTime();
}

export function isSameCalendarDate(
  left: Date | string,
  right: Date | string,
): boolean {
  return compareCalendarDates(left, right) === 0;
}

/**
 * Subscription interval rule: [startsAt, endsAt)
 * - startsAt date is ACTIVE.
 * - endsAt date is already EXPIRED.
 */
export function isSubscriptionActiveOnDate(
  startsAt: Date,
  endsAt: Date,
  targetDate: Date,
): boolean {
  return (
    compareCalendarDates(startsAt, targetDate) <= 0 &&
    compareCalendarDates(endsAt, targetDate) > 0
  );
}

/**
 * Offer/grant validity uses an inclusive end date:
 * startsAt <= targetDate <= endsAt.
 */
export function isDateInsideInclusiveRange(
  targetDate: Date,
  startsAt: Date,
  endsAt: Date,
): boolean {
  return (
    compareCalendarDates(startsAt, targetDate) <= 0 &&
    compareCalendarDates(endsAt, targetDate) >= 0
  );
}

/**
 * YYYY-MM-DD for API/log presentation when a date-only string is needed.
 */
export function formatDateOnly(value: Date | string): string {
  return toDateOnly(value).toISOString().slice(0, 10);
}

function createUtcDateOnly(year: number, month: number, day: number): Date {
  const result = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(result.getTime()) ||
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() + 1 !== month ||
    result.getUTCDate() !== day
  ) {
    throw new Error('Invalid calendar date.');
  }

  return result;
}
