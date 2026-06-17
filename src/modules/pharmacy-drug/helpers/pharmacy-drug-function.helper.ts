export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

export function formatMoney(value: unknown): string | null {
  const numberValue = decimalToNumber(value);

  if (numberValue === null) {
    return null;
  }

  return numberValue.toFixed(2);
}