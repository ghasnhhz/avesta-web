import 'server-only';

import {isSanePriceSum} from '@/lib/validate';

/**
 * Server-only: the percentage never ships in client JS. The *disclosure* is
 * public — it is in the footer and on every results row — but the number has one
 * definition, and it is this one.
 */
export const FEE_PERCENT = 10;

export type Quote = {ticketSum: number; feeSum: number; totalSum: number};

export type PartyQuote = Quote & {passengers: number};

/**
 * Null when the fare fails the rule 9 band. The parser applies the same band, but
 * this is the last gate before a number reaches a tourist, and it is the one that
 * still holds if a future source reaches the page without going through a parser.
 */
export function quote(ticketSum: number): Quote | null {
  if (!isSanePriceSum(ticketSum)) {
    console.error(`[pricing] refused to quote ${JSON.stringify(ticketSum)}: outside the sanity band`);
    return null;
  }

  const feeSum = Math.round((ticketSum * FEE_PERCENT) / 100);
  return {ticketSum, feeSum, totalSum: ticketSum + feeSum};
}

/**
 * Multiplies a quote that has already passed the band. Never re-quotes: the
 * 20,000–3,000,000 band is per ticket, and four legitimate SV fares are over the
 * ceiling as a party total.
 *
 * feeSum is multiplied rather than re-taken from the party ticket sum. At 142,985
 * those differ by two sum, which is nothing as money and everything on the screen
 * where somebody decides whether we are honest: a total that is not exactly four
 * times the one they were just shown reads as a hidden markup.
 */
export function partyQuote(one: Quote, passengers: number): PartyQuote {
  const ticketSum = one.ticketSum * passengers;
  const feeSum = one.feeSum * passengers;

  return {passengers, ticketSum, feeSum, totalSum: ticketSum + feeSum};
}
