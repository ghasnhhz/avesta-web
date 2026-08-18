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
 * twelve. `incomplete` is upstream counting services it did not return. The
 * distinction matters: "no trains run" and "the railway did not answer" must
 * never render the same way.
 */
export type SourceStatus = 'ok' | 'unknown_city' | 'failed' | 'incomplete';

export type ServiceSearch = {
  services: Service[];
  sources: {rail: SourceStatus; bus: SourceStatus};
};

export async function searchServices(
  origin: string,
  destination: string,
  date: string
): Promise<Cached<ServiceSearch>> {
  // Settled, not awaited blind: a working bus result is not thrown away because
  // the railway is down, and a bus-only route still returns buses.
  const [rail, bus] = await Promise.allSettled([
    searchTrains(origin, destination, date),
    searchBuses(origin, destination, date)
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
    services.push(...bus.value.value.trips.map((trip) => ({mode: 'bus' as const, ...trip})));
    fetchedAt.push(bus.value.fetchedAt);
    stale = stale || bus.value.stale;
    if (bus.value.value.incomplete) busStatus = 'incomplete';
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
