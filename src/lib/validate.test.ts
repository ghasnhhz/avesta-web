import {afterEach, describe, expect, it, vi} from 'vitest';
import {isSanePriceSum, sanePriceSum} from './validate';

afterEach(() => vi.restoreAllMocks());

describe('price sanity band', () => {
  it('accepts real fares seen in the captures', () => {
    for (const fare of [90_390, 142_980, 300_560, 566_450, 750_000]) {
      expect(isSanePriceSum(fare)).toBe(true);
    }
  });

  it('rejects a tariff that changed units', () => {
    expect(isSanePriceSum(150)).toBe(false);
    expect(isSanePriceSum(15_009_000)).toBe(false);
  });

  it('rejects non-numbers and zero', () => {
    for (const value of [0, null, undefined, '150000', NaN]) {
      expect(isSanePriceSum(value)).toBe(false);
    }
  });

  it('fails loudly rather than silently', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(sanePriceSum(150, 'train 054Ф 3П')).toBeNull();
    expect(error).toHaveBeenCalledOnce();
  });
});
