import {type Cached, cached} from '@/lib/cache';
import {fetchTrainList} from './client';
import {toRequestDate} from './dates';
import {parseTrains} from './parse';
import {assertRailCity, stationCode} from './stations';
import type {Train} from './types';

export {RAIL_CITIES, UnknownStationError, isRailCity} from './stations';
export {RailUpstreamError} from './client';
export type {BerthCounts, Train, TrainClass, UnavailableReason} from './types';

/**
 * Cities in, never station codes — the code table is this module's business.
 * An unknown city throws rather than reaching upstream, because a wrong code
 * returns the same empty response as a valid one with nothing running.
 */
export async function searchTrains(
  origin: string,
  destination: string,
  date: string
): Promise<Cached<Train[]>> {
  const from = assertRailCity(origin);
  const to = assertRailCity(destination);
  const depStationCode = stationCode(from);
  const arvStationCode = stationCode(to);
  const requestDate = toRequestDate(date);

  return cached(`rail:${depStationCode}:${arvStationCode}:${requestDate}`, async () => {
    const payload = await fetchTrainList(requestDate, depStationCode, arvStationCode);
    return parseTrains(payload, from, to);
  });
}
