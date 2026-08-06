import { BadRequestException } from '@nestjs/common';

/**
 * MediXa currently uses Syria local time.
 */
const APPLICATION_UTC_OFFSET = '+03:00';

/**
 * Return the next calendar date.
 */
function getNextDate(date: string): string {
  const currentDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(currentDate.getTime())) {
    throw new BadRequestException('Invalid activity date.');
  }

  if (currentDate.toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('Invalid activity date.');
  }

  currentDate.setUTCDate(currentDate.getUTCDate() + 1);

  return currentDate.toISOString().slice(0, 10);
}

/**
 * Convert a local calendar date to a UTC range.
 */
export function getActivityDateRange(date: string): {
  startAt: Date;
  endAt: Date;
} {
  const nextDate = getNextDate(date);

  const startAt = new Date(`${date}T00:00:00.000${APPLICATION_UTC_OFFSET}`);

  const endAt = new Date(`${nextDate}T00:00:00.000${APPLICATION_UTC_OFFSET}`);

  return {
    startAt,
    endAt,
  };
}
