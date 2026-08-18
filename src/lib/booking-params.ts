import {
  type RawParams,
  type SearchParamsResult,
  type SearchQuery,
  readSearchParams,
  singleParam
} from '@/lib/search-params';

/**
 * Which service a booking URL points at. The number alone is not enough — the
 * railway runs the same number on more than one day, and the departure time is
 * what makes the link readable and shareable.
 */
export type ServiceRef = {train: string; departure: string};

export type BookingParamsResult =
  | {status: 'ok'; query: SearchQuery; ref: ServiceRef}
  | Exclude<SearchParamsResult, {status: 'ok'}>;

/**
 * The journey is validated exactly as the results page validates it, so a bad
 * URL gets the same sentence on both screens. The train reference itself is only
 * checked for presence: whether it names a service that is still running is a
 * question for the live data, and buildBooking answers it.
 */
export function readBookingParams(params: RawParams, today: string): BookingParamsResult {
  const search = readSearchParams(params, today);
  if (search.status !== 'ok') return search;

  const train = singleParam(params.train);
  const departure = singleParam(params.dep);
  if (!train || !departure) return {status: 'missing'};

  return {status: 'ok', query: search.query, ref: {train, departure}};
}
