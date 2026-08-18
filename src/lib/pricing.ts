import 'server-only';

import {isSanePriceSum} from '@/lib/validate';

/**
 * Server-only: the percentage never ships in client JS. The *disclosure* is
 * public — it is in the footer and on every results row — but the number has one
 * definition, and it is this one.
 */
export const FEE_PERCENT = 10;

export type Quote = {ticketSum: number; feeSum: number; totalSum: number};

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
