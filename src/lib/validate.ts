// A tariff that silently changes units passes every structural check and quotes
// a wrong number at a tourist. Nothing outside this band is a real Uzbek fare,
// so we refuse it rather than display it.
export const MIN_PRICE_SUM = 20_000;
export const MAX_PRICE_SUM = 3_000_000;

export function isSanePriceSum(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_PRICE_SUM &&
    value <= MAX_PRICE_SUM
  );
}

/**
 * Returns the price, or null when it fails the band. Logs loudly because a
 * rejected price means upstream changed shape and someone needs to look.
 */
export function sanePriceSum(value: unknown, context: string): number | null {
  if (isSanePriceSum(value)) return value;

  console.error(
    `[price] rejected ${JSON.stringify(value)} for ${context}: outside ${MIN_PRICE_SUM}–${MAX_PRICE_SUM} sum`
  );
  return null;
}
