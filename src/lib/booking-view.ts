import type {Cached} from '@/lib/cache';
import {dayOffset} from '@/lib/dates';
import {type Quote, quote} from '@/lib/pricing';
import type {ServiceRef} from '@/lib/booking-params';
import type {Service, ServiceSearch} from '@/lib/sources';
import type {Accommodation, BerthCounts, Train, TrainClass} from '@/lib/sources/rail';

/** A preference, never a reservation. Nobody can hold a berth in advance. */
export type BerthOption = {preference: 'lower' | 'upper'; free: number};

export type ClassOption = {
  /**
   * Code and price together. The same code comes back twice at two prices in
   * real responses, so the code alone is not a key, and an index is not stable
   * across the refetch the next screen makes.
   */
  id: string;
  /** The railway's own code, verbatim ("3П"). */
  code: string;
  accommodation: Accommodation | null;
  freeSeats: number | null;
  quote: Quote;
  /** Null on seated classes, which have no berths to prefer between. */
  berths: BerthOption[] | null;
};

type Found = {
  train: Train;
  /** From two dates upstream published itself. No duration is derived here. */
  arrivalDayOffset: number;
};

/**
 * The states a booking link can land in. A train that sold out since the results
 * page was rendered, and a train we cannot put a price against, are each their
 * own answer — neither is "not found", and neither is the other.
 */
export type BookingView =
  | ({state: 'ready'; classes: ClassOption[]} & Found)
  | ({state: 'sold_out'} & Found)
  | ({state: 'price_unreliable'} & Found)
  | {state: 'not_found'}
  | {state: 'unavailable'}
  | {state: 'unserved'};

/**
 * Side berths fold into the orientation they already are: a side lower berth is
 * a lower berth, and folding keeps the two counts adding up to the free-seat
 * figure the results row shows. freeComp is excluded upstream in parse — it
 * counts free compartments, not berths.
 */
function berthOptions(berths: BerthCounts | undefined): BerthOption[] | null {
  if (!berths) return null;

  return [
    {preference: 'lower', free: berths.down + berths.lateralDn},
    {preference: 'upper', free: berths.up + berths.lateralUp}
  ];
}

/** Unknown plus a number is still unknown. A seat count is never guessed. */
function mergeSeats(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a + b;
}

function mergeBerths(a: BerthOption[] | null, b: BerthOption[] | null): BerthOption[] | null {
  if (!a || !b) return a ?? b;
  return a.map((option, index) => ({...option, free: option.free + b[index].free}));
}

/**
 * One option per class *and price*. 712Ф returns 1С twice, at one price, with 24
 * and 25 seats — two rows a tourist cannot choose between. Classes at different
 * prices never merge: a price summed across two differently priced classes is
 * the trap this whole module exists to avoid.
 */
function classOptions(classes: TrainClass[]): ClassOption[] {
  const options = new Map<string, ClassOption>();

  for (const trainClass of classes) {
    const priced = quote(trainClass.priceSum);
    if (!priced) continue;

    const id = `${trainClass.code}:${trainClass.priceSum}`;
    const existing = options.get(id);

    options.set(
      id,
      existing
        ? {
            ...existing,
            freeSeats: mergeSeats(existing.freeSeats, trainClass.freeSeats),
            berths: mergeBerths(existing.berths, berthOptions(trainClass.berths))
          }
        : {
            id,
            code: trainClass.code,
            accommodation: trainClass.accommodation,
            freeSeats: trainClass.freeSeats,
            quote: priced,
            berths: berthOptions(trainClass.berths)
          }
    );
  }

  return [...options.values()].sort((a, b) => a.quote.ticketSum - b.quote.ticketSum);
}

/**
 * Trains only. The bus branch of this screen is feature 3b and identifies a trip
 * by its id, not by a number and a departure time, so it will not reuse this.
 */
function isRequested(service: Service, ref: ServiceRef): boolean {
  return (
    service.mode === 'train' &&
    service.number === ref.train &&
    service.departure.time === ref.departure
  );
}

export function buildBooking(search: Cached<ServiceSearch>, ref: ServiceRef): BookingView {
  const {services, sources} = search.value;

  if (sources.rail === 'failed') return {state: 'unavailable'};
  if (sources.rail === 'unknown_city') return {state: 'unserved'};

  const service = services.find((candidate) => isRequested(candidate, ref));
  if (!service || service.mode !== 'train') return {state: 'not_found'};

  const found: Found = {
    train: service,
    arrivalDayOffset: dayOffset(service.departure.date, service.arrival.date)
  };

  // Sold out between the results page and this one is the ordinary case, not an
  // error: the link is a minute old and the last berth went.
  if (!service.available) {
    return {state: service.unavailableReason ?? 'sold_out', ...found};
  }

  const classes = classOptions(service.classes);
  if (classes.length === 0) return {state: 'price_unreliable', ...found};

  return {state: 'ready', classes, ...found};
}
