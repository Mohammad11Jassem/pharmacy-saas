import { randomBytes } from 'crypto';

export function generateDamageInvoiceNumber(date = new Date()): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  const randomPart = randomBytes(3)
    .toString('hex')
    .toUpperCase();

  return `DMG-${year}${month}${day}-${randomPart}`;
}