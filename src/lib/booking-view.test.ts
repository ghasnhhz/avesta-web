import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Cached} from '@/lib/cache';
import type {Service, ServiceSearch, SourceStatus} from '@/lib/sources';
import {parseTrains} from '@/lib/sources/rail/parse';
import samarkand from '@/lib/sources/rail/__fixtures__/tashkent-samarkand-2026-08-19.json';
import {buildBooking} from './booking-view';

afterEach(() => vi.restoreAllMocks());

function search(services: Service[], rail: SourceStatus = 'ok'): Cached<ServiceSearch> {
  return {
    value: {services, sources: {rail, bus: 'no_access'}},
    fetchedAt: 1_000,
    stale: false
  };
}

function trainsFrom(fixture: unknown): Service[] {
  return parseTrains(fixture, 'Tashkent', 'Samarkand').map((train) => ({
    mode: 'train' as const,
    ...train
  }));
}

const samarkandTrains = () => trainsFrom(samarkand);

/** Every train in the fixture leaves on 2026-08-19, so the time identifies it. */
function open(train: string, dep: string, services: Service[] = samarkandTrains()) {
  return buildBooking(search(services), {train, departure: dep});
}

function ready(view: ReturnType<typeof buildBooking>) {
  if (view.state !== 'ready') throw new Error(`expected ready, got ${view.state}`);
  return view;
}

describe('finding the train', () => {
  it('opens the train the link names', () => {
    const view = ready(open('082Ф', '21:12'));

    expect(view.train.number).toBe('082Ф');
    expect(view.train.arrival.time).toBe('01:09');
    expect(view.arrivalDayOffset).toBe(1);
  });

  it('does not open a train of the same number leaving at another time', () => {
    expect(open('082Ф', '07:00').state).toBe('not_found');
  });

  it('reports a train the railway no longer lists rather than throwing', () => {
    expect(open('999Ф', '21:12').state).toBe('not_found');
  });

  it('tells a railway that did not answer apart from a route we do not sell', () => {
    expect(buildBooking(search([], 'failed'), {train: '082Ф', departure: '21:12'}).state).toBe(
      'unavailable'
    );
    expect(buildBooking(search([], 'unknown_city'), {train: '082Ф', departure: '21:12'}).state).toBe(
      'unserved'
    );
  });
});

describe('classes', () => {
  it('lists every class with its own price and count', () => {
    const {classes} = ready(open('082Ф', '21:12'));

    expect(classes.map((c) => [c.code, c.accommodation, c.quote.ticketSum, c.freeSeats])).toEqual([
      ['3П', 'platskart', 142980, 4],
      ['2К', 'kupe', 188820, 4],
      ['1Л', 'sv', 320060, 4]
    ]);
  });

  it('quotes the fee and total against each class, not the cheapest', () => {
    const {classes} = ready(open('082Ф', '21:12'));
    const sv = classes.find((c) => c.code === '1Л')!;

    expect(sv.quote).toEqual({ticketSum: 320060, feeSum: 32006, totalSum: 352066});
  });

  it('merges a class the railway returns twice at one price', () => {
    // 712Ф returns 1С twice, at 300,560, with 24 and 25 seats. Two rows a
    // tourist cannot choose between are one option with 49 seats.
    const {classes} = ready(open('712Ф', '20:32'));

    expect(classes.map((c) => [c.code, c.quote.ticketSum, c.freeSeats])).toEqual([
      ['2В', 200060, 95],
      ['1С', 300560, 49],
      ['1В', 566450, 9]
    ]);
  });

  it('keeps one code at two prices as two options', () => {
    const twoPrices = structuredClone(samarkand) as typeof samarkand;
    const cars = twoPrices.data.directions.forward.trains[6].cars[0];
    cars.tariffs[1].tariff = 311000;

    const {classes} = ready(open('712Ф', '20:32', trainsFrom(twoPrices)));
    const seated = classes.filter((c) => c.code === '1С');

    expect(seated.map((c) => [c.quote.ticketSum, c.freeSeats])).toEqual([
      [300560, 24],
      [311000, 25]
    ]);
  });

  it('orders classes cheapest first', () => {
    const {classes} = ready(open('080Ф', '21:13'));
    const prices = classes.map((c) => c.quote.ticketSum);

    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('drops a class whose fare fails the sanity band and keeps the rest', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = structuredClone(samarkand) as typeof samarkand;
    // A tariff that silently changed units — structurally valid, wrong number.
    broken.data.directions.forward.trains[7].cars[1].tariffs[0].tariff = 188;

    const {classes} = ready(open('082Ф', '21:12', trainsFrom(broken)));

    expect(classes.map((c) => c.code)).toEqual(['3П', '1Л']);
    expect(error).toHaveBeenCalled();
  });
});

describe('berth preference', () => {
  it('folds side berths into lower and upper', () => {
    // 054Ф plackart: 1 lower and 11 upper in the compartments, 6 and 7 on the
    // side. Folded, the two counts add up to the 25 seats the row shows.
    const {classes} = ready(open('054Ф', '16:00'));

    expect(classes[0].berths).toEqual([
      {preference: 'lower', free: 7},
      {preference: 'upper', free: 18}
    ]);
    expect(classes[0].freeSeats).toBe(25);
  });

  it('keeps an option with nothing free rather than hiding it', () => {
    // A preference is not a reservation and the count drifts before purchase,
    // so zero is stated, not removed.
    const {classes} = ready(open('125Ч', '22:35'));

    expect(classes[0].berths).toEqual([
      {preference: 'lower', free: 0},
      {preference: 'upper', free: 1}
    ]);
  });

  it('offers no berth preference on a seated class', () => {
    const {classes} = ready(open('710Ф', '08:37'));
    for (const option of classes) expect(option.berths).toBeNull();
  });
});

describe('unbookable trains', () => {
  it('answers sold out for a train that has no cars', () => {
    const view = open('127Ф', '01:10');

    expect(view.state).toBe('sold_out');
    if (view.state !== 'sold_out') return;
    expect(view.train.departure.time).toBe('01:10');
  });

  it('answers price unreliable when every fare on the train was refused', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = structuredClone(samarkand) as typeof samarkand;
    for (const car of broken.data.directions.forward.trains[7].cars) {
      for (const tariff of car.tariffs) tariff.tariff = 188;
    }

    expect(open('082Ф', '21:12', trainsFrom(broken)).state).toBe('price_unreliable');
    expect(error).toHaveBeenCalled();
  });
});
