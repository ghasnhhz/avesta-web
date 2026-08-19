import {afterEach, describe, expect, it, vi} from 'vitest';
import {FEE_PERCENT, partyQuote, quote} from './pricing';

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

describe('partyQuote', () => {
  it('charges four passengers exactly four times what one was quoted', () => {
    // A total that is not exactly the per-ticket figure times the party reads as
    // a hidden markup, on the screen where trust is being decided.
    const one = quote(142_985)!;
    const four = partyQuote(one, 4);

    expect(four.ticketSum).toBe(one.ticketSum * 4);
    expect(four.feeSum).toBe(one.feeSum * 4);
  });

  it('multiplies the fee rather than re-taking the percentage', () => {
    // 10% of 571,940 rounds to 57,194. Four fees of 14,299 are 57,196.
    expect(partyQuote(quote(142_985)!, 4).feeSum).toBe(57_196);
  });

  it('keeps the three displayed lines adding up', () => {
    const party = partyQuote(quote(225_000)!, 3);

    expect(party.totalSum).toBe(party.ticketSum + party.feeSum);
  });

  it('prices a party whose total is above the per-ticket sanity band', () => {
    // Four SV fares exceed 3,000,000 together. Re-quoting the total would refuse
    // a real order, which is why an already-validated quote is multiplied.
    const party = partyQuote(quote(900_000)!, 4);

    expect(party.ticketSum).toBe(3_600_000);
    expect(party.passengers).toBe(4);
  });

  it('leaves a single passenger with the numbers already shown', () => {
    const one = quote(142_980)!;

    expect(partyQuote(one, 1)).toEqual({...one, passengers: 1});
  });
});
