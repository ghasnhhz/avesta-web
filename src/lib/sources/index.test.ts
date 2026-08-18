import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Trip} from './bus';
import {UnknownLocationError} from './bus';
import type {Train} from './rail';
import {UnknownStationError} from './rail';
import {searchServices} from './index';

vi.mock('./rail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./rail')>()),
  searchTrains: vi.fn()
}));
vi.mock('./bus', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./bus')>()),
  searchBuses: vi.fn()
}));

const {searchTrains} = await import('./rail');
const {searchBuses} = await import('./bus');

afterEach(() => vi.restoreAllMocks());

// Both sources are stubbed at their own contract: this file is about the merge,
// and each parser is tested against real captured responses elsewhere.
function train(number: string, time: string, available = true): Train {
  return {
    number,
    type: 'СК',
    brand: 'Шарк',
    origin: 'Urgench',
    destination: 'Tashkent',
    departure: {date: '2026-08-26', time},
    arrival: {date: '2026-08-26', time: '23:59'},
    timeOnWay: '13:00',
    available,
    ...(available ? {} : {unavailableReason: 'sold_out' as const}),
    classes: [],
    sortKey: `2026-08-26T${time}`
  };
}

function trip(id: number, time: string): Trip {
  return {
    id,
    carrier: {apiId: 4, name: 'COMFORTAUTO', host: 'https://wapi.comfortauto.avtotickets.uz'},
    transporter: '"Comfort Auto Hamkor" MCHJ',
    busModel: 'ZHONG TONG 51',
    origin: 'Urgench',
    destination: 'Tashkent',
    originName: 'Urgench',
    destinationName: 'Tashkent',
    fromId: 314,
    toId: 298,
    departure: {date: '2026-08-26', time},
    arrival: null,
    boarding: null,
    priceSum: 240_000,
    seats: 51,
    soldSeats: 13,
    availableSeats: 38,
    available: true,
    sortKey: `2026-08-26T${time}`
  };
}

const railReturns = (trains: Train[], extra = {}) =>
  vi.mocked(searchTrains).mockResolvedValue({value: trains, fetchedAt: 1000, stale: false, ...extra});

const busReturns = (trips: Trip[], incomplete = false, extra = {}) =>
  vi.mocked(searchBuses).mockResolvedValue({
    value: {trips, count: trips.length, incomplete},
    fetchedAt: 2000,
    stale: false,
    ...extra
  });

describe('merging', () => {
  it('returns one list in departure order, not trains then buses', async () => {
    railReturns([train('056Ж', '14:20')]);
    busReturns([trip(61720, '09:00'), trip(61721, '21:30')]);

    const {value} = await searchServices('Urgench', 'Tashkent', '2026-08-26');

    expect(value.services.map((s) => [s.mode, s.departure.time])).toEqual([
      ['bus', '09:00'],
      ['train', '14:20'],
      ['bus', '21:30']
    ]);
  });

  it('sorts a sold-out train into its place rather than appending it', async () => {
    railReturns([train('126Ф', '13:00', false)]);
    busReturns([trip(61720, '09:00'), trip(61721, '21:30')]);

    const {value} = await searchServices('Urgench', 'Tashkent', '2026-08-26');
    const soldOut = value.services.findIndex((s) => !s.available);

    expect(soldOut).toBe(1);
  });

  it('is only as fresh as its stalest half', async () => {
    railReturns([train('056Ж', '14:20')], {stale: true});
    busReturns([trip(61720, '09:00')]);

    const result = await searchServices('Urgench', 'Tashkent', '2026-08-26');

    expect(result.stale).toBe(true);
    expect(result.fetchedAt).toBe(1000);
  });
});

describe('one source, one route', () => {
  it('still returns buses on a route the railway does not serve', async () => {
    vi.mocked(searchTrains).mockRejectedValue(new UnknownStationError('Hazarasp'));
    busReturns([trip(61720, '09:00')]);

    const {value} = await searchServices('Hazarasp', 'Tashkent', '2026-08-26');

    expect(value.services).toHaveLength(1);
    expect(value.sources).toEqual({rail: 'unknown_city', bus: 'ok'});
  });

  it('still returns trains when the bus city is unknown', async () => {
    railReturns([train('056Ж', '14:20')]);
    vi.mocked(searchBuses).mockRejectedValue(new UnknownLocationError('Nukus'));

    const {value} = await searchServices('Urgench', 'Nukus', '2026-08-26');

    expect(value.services).toHaveLength(1);
    expect(value.sources).toEqual({rail: 'ok', bus: 'unknown_city'});
  });
});

describe('a source that fails', () => {
  it('keeps the other half and says which one did not answer', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(searchTrains).mockRejectedValue(new Error('502'));
    busReturns([trip(61720, '09:00')]);

    const {value} = await searchServices('Urgench', 'Tashkent', '2026-08-26');

    expect(value.services).toHaveLength(1);
    // "the railway did not answer" must not read as "no trains run".
    expect(value.sources.rail).toBe('failed');
    expect(error).toHaveBeenCalled();
  });

  it('reports upstream counting buses it did not return', async () => {
    railReturns([]);
    busReturns([], true);

    const {value} = await searchServices('Urgench', 'Tashkent', '2026-08-26');

    expect(value.services).toEqual([]);
    expect(value.sources).toEqual({rail: 'ok', bus: 'incomplete'});
  });
});
