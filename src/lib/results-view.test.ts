import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Cached} from '@/lib/cache';
import type {Service, ServiceSearch, SourceStatus} from '@/lib/sources';
import type {Trip} from '@/lib/sources/bus';
import {parseTrains} from '@/lib/sources/rail/parse';
import samarkand from '@/lib/sources/rail/__fixtures__/tashkent-samarkand-2026-08-19.json';
import urgench from '@/lib/sources/rail/__fixtures__/urgench-tashkent-2026-08-26.json';
import {buildResults} from './results-view';

afterEach(() => vi.restoreAllMocks());

function search(services: Service[], rail: SourceStatus = 'ok'): Cached<ServiceSearch> {
  return {
    value: {services, sources: {rail, bus: 'no_access'}},
    fetchedAt: 1_000,
    stale: false
  };
}

function trains(fixture: unknown, from: 'Urgench' | 'Tashkent', to: 'Tashkent' | 'Samarkand') {
  return parseTrains(fixture, from, to).map((train) => ({mode: 'train' as const, ...train}));
}

const urgenchTrains = () => trains(urgench, 'Urgench', 'Tashkent');
const samarkandTrains = () => trains(samarkand, 'Tashkent', 'Samarkand');

function listOf(view: ReturnType<typeof buildResults>) {
  if (view.state !== 'list') throw new Error(`expected a list, got ${view.state}`);
  return view;
}

describe('rows', () => {
  it('lists a sold-out train with its times and no price', () => {
    const {rows} = listOf(buildResults(search(urgenchTrains())));
    const soldOut = rows.filter((row) => row.kind === 'sold_out');

    expect(soldOut).toHaveLength(2);
    for (const row of soldOut) {
      expect(row.fares).toEqual([]);
      expect(row.cheapest).toBeNull();
      expect(row.service.departure.time).toBeTruthy();
    }
  });

  it('keeps sold-out trains in departure order rather than at the end', () => {
    const {rows, soldOutCount} = listOf(buildResults(search(samarkandTrains())));

    expect(rows).toHaveLength(17);
    expect(soldOutCount).toBe(6);
    // 127Ф at 01:10 is sold out and upstream appends it after the bookable
    // trains; it belongs second, between 124Ф at 00:10 and 764Ф at 06:33.
    expect(rows.slice(0, 3).map((row) => [row.service.departure.time, row.kind])).toEqual([
      ['00:10', 'bookable'],
      ['01:10', 'sold_out'],
      ['06:33', 'bookable']
    ]);
  });

  it('marks a train the railway would not price as unreliable, not sold out', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const poked = structuredClone(urgench);
    // A tariff that silently changed units. Structurally valid, wrong number.
    poked.data.directions.forward.trains[0].cars[0].tariffs[0].tariff = 750;

    const {rows} = listOf(buildResults(search(trains(poked, 'Urgench', 'Tashkent'))));

    expect(rows[0].kind).toBe('price_unreliable');
    expect(rows[0].fares).toEqual([]);
    expect(error).toHaveBeenCalled();
  });

  it('keeps two classes with the same code at different prices as two fares', () => {
    const {rows} = listOf(buildResults(search(samarkandTrains())));
    const doubled = rows.find((row) => row.service.mode === 'train' && row.service.number === '712Ф');

    expect(doubled?.fares.filter((fare) => fare.code === '1С')).toHaveLength(2);
  });

  it('gives every row a key that is not a class code', () => {
    const {rows} = listOf(buildResults(search(samarkandTrains())));
    const keys = rows.map((row) => row.key);

    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^train:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d+$/);
  });

  it('quotes the cheapest class as the headline fare', () => {
    const {rows} = listOf(buildResults(search(samarkandTrains())));
    const multi = rows.find((row) => row.service.mode === 'train' && row.service.number === '082Ф');

    // 3П 142,980 · 2К 188,820 · 1Л 320,060
    expect(multi?.cheapest).toEqual({ticketSum: 142_980, feeSum: 14_298, totalSum: 157_278});
  });

  it('marks an arrival after midnight as the next day', () => {
    const {rows} = listOf(buildResults(search(samarkandTrains())));
    const overnight = rows.find((row) => row.service.mode === 'train' && row.service.number === '082Ф');
    const sameDay = rows.find((row) => row.service.mode === 'train' && row.service.number === '054Ф');

    expect(overnight?.arrivalDayOffset).toBe(1);
    expect(sameDay?.arrivalDayOffset).toBe(0);
  });
});

describe('states', () => {
  it('says no trains run when the railway answered with none', () => {
    expect(buildResults(search([]))).toEqual({state: 'none'});
  });

  it('says the railway did not answer rather than that no trains run', () => {
    expect(buildResults(search([], 'failed'))).toEqual({state: 'unavailable'});
  });

  it('says we do not sell a journey the railway does not serve', () => {
    expect(buildResults(search([], 'unknown_city'))).toEqual({state: 'unserved'});
  });
});

describe('a bus, once access opens', () => {
  it('prices a bus without any bus-specific handling', () => {
    const trip: {mode: 'bus'} & Partial<Trip> = {
      mode: 'bus',
      departure: {date: '2026-08-19', time: '13:00'},
      arrival: null,
      priceSum: 240_000,
      availableSeats: 38,
      available: true,
      sortKey: '2026-08-19T13:00'
    };

    const {rows} = listOf(buildResults(search([trip as unknown as Service])));

    expect(rows[0].kind).toBe('bookable');
    expect(rows[0].fares).toEqual([
      {code: null, freeSeats: 38, quote: {ticketSum: 240_000, feeSum: 24_000, totalSum: 264_000}}
    ]);
    // Upstream published no arrival, so there is no day offset to state.
    expect(rows[0].arrivalDayOffset).toBeNull();
  });
});
