import {type Cached, cached} from '@/lib/cache';
import {fetchSeatMap, fetchTrips} from './client';
import {toRequestDate} from './dates';
import {assertBusCity, locationId} from './locations';
import {parseSeatMap, parseTrips} from './parse';
import type {BusSearch, BusSeatMap, Trip} from './types';

export {BUS_CITIES, UnknownLocationError, isBusCity} from './locations';
export {BusUpstreamError} from './client';
export type {BusCity} from './locations';
export type {Carrier} from './carriers';
export type {BusSearch, BusSeat, BusSeatMap, SeatGender, Trip} from './types';

/**
 * Cities in, never location codes — the code table is this module's business.
 * An unknown city throws rather than reaching upstream, because a code in the
 * wrong field comes back empty rather than as an error.
 */
export async function searchBuses(
  origin: string,
  destination: string,
  date: string
): Promise<Cached<BusSearch>> {
  const from = assertBusCity(origin);
  const to = assertBusCity(destination);
  const requestDate = toRequestDate(date);

  return cached(`bus:${locationId(from)}:${locationId(to)}:${requestDate}`, async () => {
    const payload = await fetchTrips(requestDate, locationId(from), locationId(to));
    return parseTrips(payload, from, to, requestDate);
  });
}

export class UnknownCarrierError extends Error {
  constructor(readonly tripId: number) {
    super(`Trip ${tripId} has no known carrier, so its seat map host is unknown`);
    this.name = 'UnknownCarrierError';
  }
}

/**
 * A seat tap is a preference, never a reservation — nothing is held between the
 * tourist choosing and the operator buying.
 */
export async function busSeatMap(trip: Trip): Promise<Cached<BusSeatMap>> {
  const {carrier} = trip;
  if (!carrier) throw new UnknownCarrierError(trip.id);

  return cached(`bus-seats:${carrier.apiId}:${trip.id}`, async () => {
    const payload = await fetchSeatMap(carrier.host, trip.fromId, trip.toId, trip.id);
    return parseSeatMap(payload, trip.id);
  });
}
