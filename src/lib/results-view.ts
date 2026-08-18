import type {Cached} from '@/lib/cache';
import {dayOffset} from '@/lib/dates';
import {type Quote, quote} from '@/lib/pricing';
import type {Service, ServiceSearch} from '@/lib/sources';

/** One priced option on a service. `code` is null on a bus, which has no class. */
export type Fare = {
  /** The railway's own class code, verbatim ("3П"). Never glossed, never a key. */
  code: string | null;
  freeSeats: number | null;
  quote: Quote;
};

export type RowKind = 'bookable' | 'sold_out' | 'price_unreliable';

export type ServiceRow = {
  /**
   * Not the class code and not the service number: classes[] can hold the same
   * code twice at different prices, and two services can leave the same minute.
   */
  key: string;
  kind: RowKind;
  /** Passed through untouched — times, number and timeOnWay render verbatim. */
  service: Service;
  /**
   * Whole days between two dates upstream itself published, for the "+1" on an
   * arrival after midnight. Not a duration: no hours or minutes are derived
   * anywhere in this file (CLAUDE.md rule 8).
   */
  arrivalDayOffset: number | null;
  /** Empty unless bookable. A sold-out service is never priced. */
  fares: Fare[];
  cheapest: Quote | null;
};

/**
 * Four states that must never be confused with one another: a list, a route with
 * nothing running, a railway that did not answer, and a journey we do not sell.
 * "No trains run" and "the railway is down" are different sentences.
 */
export type ResultsView =
  | {state: 'list'; rows: ServiceRow[]; soldOutCount: number}
  | {state: 'none'}
  | {state: 'unavailable'}
  | {state: 'unserved'};

function faresFor(service: Service): Fare[] {
  if (service.mode === 'train') {
    return service.classes.flatMap((trainClass) => {
      const priced = quote(trainClass.priceSum);
      return priced ? [{code: trainClass.code, freeSeats: trainClass.freeSeats, quote: priced}] : [];
    });
  }

  // Buses are gated off upstream, so this is unreachable today. It exists so that
  // opening BUS_ACCESS makes buses appear rather than throw — see DECISIONS 13.
  const priced = service.priceSum === null ? null : quote(service.priceSum);
  return priced ? [{code: null, freeSeats: service.availableSeats, quote: priced}] : [];
}

function rowFor(service: Service, index: number): ServiceRow {
  const base = {
    key: `${service.mode}:${service.sortKey}:${index}`,
    service,
    arrivalDayOffset: service.arrival
      ? dayOffset(service.departure.date, service.arrival.date)
      : null
  };

  if (!service.available) {
    return {
      ...base,
      kind: service.unavailableReason ?? 'sold_out',
      fares: [],
      cheapest: null
    };
  }

  const fares = faresFor(service);

  // Every fare refused by the sanity band leaves a service that upstream calls
  // bookable and we cannot put a number against. That is not sold out, and it
  // must not be rendered as though it were.
  if (fares.length === 0) {
    return {...base, kind: 'price_unreliable', fares: [], cheapest: null};
  }

  const cheapest = fares.reduce((low, fare) =>
    fare.quote.ticketSum < low.quote.ticketSum ? fare : low
  ).quote;

  return {...base, kind: 'bookable', fares, cheapest};
}

export function buildResults(search: Cached<ServiceSearch>): ResultsView {
  const {services, sources} = search.value;

  // sources.bus is deliberately not read. It is `no_access` while the bus API
  // refuses us, and a source we never asked has nothing to say to a tourist.
  if (sources.rail === 'failed') return {state: 'unavailable'};
  if (sources.rail === 'unknown_city') return {state: 'unserved'};
  if (services.length === 0) return {state: 'none'};

  // Already sorted by departure in searchServices, sold-out services in place.
  const rows = services.map(rowFor);

  return {
    state: 'list',
    rows,
    soldOutCount: rows.filter((row) => row.kind === 'sold_out').length
  };
}
