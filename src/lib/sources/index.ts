import type {Cached} from '@/lib/cache';
import {UnknownLocationError, searchBuses} from './bus';
import type {Trip} from './bus';
import {UnknownStationError, searchTrains} from './rail';
import type {Train} from './rail';

export type {UnavailableReason} from './types';

/**
 * One list, both modes. The shared fields — departure, arrival, available,
 * sortKey — are named identically on Train and Trip so the results list sorts
 * and renders without knowing the mode, while class and seat detail stay
 * reachable behind the discriminant.
 */
export type Service = ({mode: 'train'} & Train) | ({mode: 'bus'} & Trip);

/**
 * `unknown_city` is a route this mode does not serve — most pairs are served by
 * one mode only, and the rail table holds five cities against the bus table's
 * twelve. `incomplete` is upstream counting services it did not return.
 * `no_access` is a source we did not ask at all. The distinctions matter: "no
 * trains run", "the railway did not answer" and "we cannot reach the bus API"
 * must never render the same way, and `no_access` must never render as
 * "no buses run".
 */
export type SourceStatus = 'ok' | 'unknown_city' | 'failed' | 'incomplete' | 'no_access';

export type ServiceSearch = {
  services: Service[];
  sources: {rail: SourceStatus; bus: SourceStatus};
};

/**
 * wapi.avtoticket.uz answers 403 to any caller that is not a browser on
 * avtoticket.uz, before it looks at the token. Asking it costs a round trip and
 * returns nothing, so we do not ask. See DECISIONS 13 — this is a constant and
 * not an env var on purpose, so switching buses on is a commit and a review
 * rather than a setting that could turn on an unrendered path in production.
 */
export const BUS_ACCESS = false;

export type SearchOptions = {includeBus?: boolean};

export async function searchServices(
  origin: string,
  destination: string,
  date: string,
  options: SearchOptions = {}
): Promise<Cached<ServiceSearch>> {
  const includeBus = options.includeBus ?? BUS_ACCESS;

  // Settled, not awaited blind: a working bus result is not thrown away because
  // the railway is down, and a bus-only route still returns buses.
  const [rail, bus] = await Promise.allSettled([
    searchTrains(origin, destination, date),
    includeBus ? searchBuses(origin, destination, date) : Promise.resolve(null)
  ]);

  const services: Service[] = [];
  const fetchedAt: number[] = [];
  let stale = false;

  let railStatus: SourceStatus = 'ok';
  if (rail.status === 'fulfilled') {
    services.push(...rail.value.value.map((train) => ({mode: 'train' as const, ...train})));
    fetchedAt.push(rail.value.fetchedAt);
    stale = stale || rail.value.stale;
  } else if (rail.reason instanceof UnknownStationError) {
    railStatus = 'unknown_city';
  } else {
    railStatus = 'failed';
    console.error(`[services] rail ${origin}→${destination} ${date} failed:`, rail.reason);
  }

  let busStatus: SourceStatus = 'ok';
  if (bus.status === 'fulfilled') {
    if (bus.value === null) {
      // Not asked, so not a failure. Nothing is logged and nothing is missing.
      busStatus = 'no_access';
    } else {
      services.push(...bus.value.value.trips.map((trip) => ({mode: 'bus' as const, ...trip})));
      fetchedAt.push(bus.value.fetchedAt);
      stale = stale || bus.value.stale;
      if (bus.value.value.incomplete) busStatus = 'incomplete';
    }
  } else if (bus.reason instanceof UnknownLocationError) {
    busStatus = 'unknown_city';
  } else {
    busStatus = 'failed';
    console.error(`[services] bus ${origin}→${destination} ${date} failed:`, bus.reason);
  }

  // Sold-out services sort into place by departure rather than being appended.
  services.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return {
    value: {services, sources: {rail: railStatus, bus: busStatus}},
    // The older of the two: the merged list is only as fresh as its stalest half.
    fetchedAt: fetchedAt.length > 0 ? Math.min(...fetchedAt) : Date.now(),
    stale
  };
}
