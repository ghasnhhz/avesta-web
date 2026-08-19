import {
  type BookingParamsResult,
  type ServiceRef,
  readBookingParams
} from '@/lib/booking-params';
import type {RawParams, SearchQuery} from '@/lib/search-params';
import {singleParam} from '@/lib/search-params';

export type BerthPreference = 'lower' | 'upper' | 'any';

/** What the tourist chose on the booking screen, as the link carries it. */
export type Choice = {classId: string; berth: BerthPreference};

export type ChoiceParamsResult =
  | {status: 'ok'; query: SearchQuery; ref: ServiceRef; choice: Choice}
  | {status: 'no_class'; query: SearchQuery; ref: ServiceRef}
  | Exclude<BookingParamsResult, {status: 'ok'}>;

const BERTHS: readonly BerthPreference[] = ['lower', 'upper', 'any'];

/**
 * The journey and the train are validated exactly as the booking screen
 * validates them, so a mangled link says the same sentence on both screens.
 *
 * Two asymmetries, both deliberate. A missing class is `no_class` and carries
 * the journey with it, because we know which train this is and the honest
 * destination is that train's own class list, not the search form. And a berth
 * we cannot read is `any` rather than a rejection: a berth is a request nobody
 * can honour in advance, so refusing the whole link over it is out of all
 * proportion to what it means.
 *
 * The class id is not checked for meaning here. Whether that code is still
 * listed at that price is a question for the live data, and buildPassengerChoice
 * asks it.
 */
export function readChoiceParams(params: RawParams, today: string): ChoiceParamsResult {
  const booking = readBookingParams(params, today);
  if (booking.status !== 'ok') return booking;

  const {query, ref} = booking;

  const classId = singleParam(params.class);
  if (!classId) return {status: 'no_class', query, ref};

  return {status: 'ok', query, ref, choice: {classId, berth: readBerth(params.berth)}};
}

function readBerth(value: string | string[] | undefined): BerthPreference {
  const berth = singleParam(value);
  return BERTHS.includes(berth as BerthPreference) ? (berth as BerthPreference) : 'any';
}
