import {afterEach, describe, expect, it, vi} from 'vitest';
import {FEE_PERCENT, quote} from './pricing';

afterEach(() => vi.restoreAllMocks());

describe('quote', () => {
  it('keeps the fee as its own amount, never folded into the ticket', () => {
    const result = quote(225_000);

    expect(result).toEqual({ticketSum: 225_000, feeSum: 22_500, totalSum: 247_500});
    expect(FEE_PERCENT).toBe(10);
  });

  it('totals the ticket plus the fee', () => {
    const result = quote(142_980);

    expect(result?.totalSum).toBe(result!.ticketSum + result!.feeSum);
  });

  it('rounds the fee to whole sum', () => {
    // The bank moves whole sum; a fraction of a tiyin is not a price.
    expect(quote(150_095)?.feeSum).toBe(15_010);
  });

  it('refuses a fare below the sanity band and says so loudly', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(quote(750)).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it('refuses a fare above the sanity band and says so loudly', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(quote(30_000_000)).toBeNull();
    expect(error).toHaveBeenCalled();
  });
});
