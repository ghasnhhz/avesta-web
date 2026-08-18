import {isJourneyDate} from '@/lib/dates';
import {type RailCity, isRailCity} from '@/lib/sources/rail';

export type SearchQuery = {from: RailCity; to: RailCity; date: string};

/**
 * Everything wrong with a search, told apart. A malformed date left to reach
 * searchServices() would throw, be caught as a source failure, and render as
 * "the railway did not answer" — a lie about whose fault it is.
 */
export type SearchParamsResult =
  | {status: 'ok'; query: SearchQuery}
  | {status: 'missing'}
  | {status: 'unknown_city'; city: string}
  | {status: 'same_city'; city: RailCity}
  | {status: 'bad_date'; date: string}
  | {status: 'past_date'; date: string};

export type RawParams = Record<string, string | string[] | undefined>;

// A repeated parameter arrives as an array. There is no sensible way to pick one,
// so the search counts as unasked rather than half-guessed.
export function singleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readSearchParams(params: RawParams, today: string): SearchParamsResult {
  const from = singleParam(params.from);
  const to = singleParam(params.to);
  const date = singleParam(params.date);

  if (!from || !to || !date) return {status: 'missing'};
  if (!isRailCity(from)) return {status: 'unknown_city', city: from};
  if (!isRailCity(to)) return {status: 'unknown_city', city: to};
  if (from === to) return {status: 'same_city', city: from};
  if (!isJourneyDate(date)) return {status: 'bad_date', date};
  if (date < today) return {status: 'past_date', date};

  return {status: 'ok', query: {from, to, date}};
}
