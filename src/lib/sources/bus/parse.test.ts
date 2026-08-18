import {afterEach, describe, expect, it, vi} from 'vitest';
import seatmap from './__fixtures__/seatmap-comfortauto-61720.json';
import reverse from './__fixtures__/tashkent-urgench-2026-08-19.json';
import forward from './__fixtures__/urgench-tashkent-2026-08-19.json';
import {parseSeatMap, parseTrips} from './parse';

afterEach(() => vi.restoreAllMocks());

const toTashkent = () => parseTrips(forward, 'Urgench', 'Tashkent', '2026-08-19');
const toUrgench = () => parseTrips(reverse, 'Tashkent', 'Urgench', '2026-08-19');

describe('no trips', () => {
  it('reads count rather than reporting no buses on a day upstream left empty', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    // 2026-08-20 is in the same response, with count 5 and an empty trips array.
    const result = parseTrips(forward, 'Urgench', 'Tashkent', '2026-08-20');

    expect(result.trips).toEqual([]);
    expect(result.count).toBe(5);
    expect(result.incomplete).toBe(true);
    expect(error).toHaveBeenCalled();
  });

  it('is not incomplete when upstream counts nothing either', () => {
    expect(parseTrips(forward, 'Urgench', 'Tashkent', '2026-08-18')).toEqual({
      trips: [],
      count: 0,
      incomplete: false
    });
  });

  it('does not throw on a payload that is nothing like a response', () => {
    for (const junk of [null, undefined, {}, {data: null}, {data: []}]) {
      expect(parseTrips(junk, 'Urgench', 'Tashkent', '2026-08-19').trips).toEqual([]);
    }
  });
});

describe('seats', () => {
  it('subtracts sold seats, since there is no availability field', () => {
    expect(toTashkent().trips.map((t) => [t.id, t.seats, t.soldSeats, t.availableSeats])).toEqual([
      [61720, 51, 37, 14],
      [61745, 51, 28, 23],
      [61770, 51, 37, 14],
      [61795, 51, 47, 4],
      [61820, 51, 21, 30]
    ]);
  });

  it('marks a full bus sold out, listed with its times and unbookable', () => {
    const full = structuredClone(forward) as typeof forward;
    full.data[1].trips[0].sold_seats = 51;

    const trip = parseTrips(full, 'Urgench', 'Tashkent', '2026-08-19').trips[0];

    expect(trip.availableSeats).toBe(0);
    expect(trip.available).toBe(false);
    expect(trip.unavailableReason).toBe('sold_out');
    expect(trip.departure.time).toBe('13:00');
  });
});

describe('times', () => {
  it('keeps a real next-day arrival', () => {
    const trip = toTashkent().trips[0];

    expect(trip.departure).toEqual({date: '2026-08-19', time: '13:00'});
    expect(trip.arrival).toEqual({date: '2026-08-20', time: '06:00'});
  });

  it('drops the arrival when upstream returns it equal to the departure', () => {
    // Four of the five reverse trips come back with diff 0 and both stamps
    // identical. That is an unknown arrival, not an instant journey.
    const trips = toUrgench().trips;

    expect(trips.filter((t) => t.arrival === null)).toHaveLength(4);
    expect(trips.find((t) => t.id === 61658)?.arrival).toEqual({date: '2026-08-20', time: '13:30'});
  });

  it('carries trip_time as boarding, an hour before departure', () => {
    const trip = toTashkent().trips[0];

    expect(trip.boarding).toEqual({date: '2026-08-19', time: '12:00'});
    expect(trip.departure.time).toBe('13:00');
  });

  it('exposes no duration at all, so no caller can render one', () => {
    // Upstream offers three conflicting durations and a garbage distance.
    const trip = toTashkent().trips[0] as unknown as Record<string, unknown>;

    for (const key of ['duration', 'diff', 'timeOnWay', 'distance']) {
      expect(trip[key]).toBeUndefined();
    }
  });
});

describe('ordering and identity', () => {
  it('sorts by departure', () => {
    const keys = toTashkent().trips.map((t) => t.sortKey);

    expect([...keys].sort((a, b) => a.localeCompare(b))).toEqual(keys);
  });

  it('names the leg travelled, not the through route', () => {
    const trip = toUrgench().trips[0];

    // route_name_en on this one is "Tashkent - Gurlan", which is not the journey.
    expect([trip.originName, trip.destinationName]).toEqual(['Tashkent', 'Urgench']);
    expect([trip.origin, trip.destination]).toEqual(['Tashkent', 'Urgench']);
  });

  it('keeps the trip-record ids the seat map needs, not the search codes', () => {
    const trip = toTashkent().trips[0];

    expect([trip.fromId, trip.toId]).toEqual([314, 298]);
    expect(trip.carrier).toEqual({
      apiId: 4,
      name: 'COMFORTAUTO',
      host: 'https://wapi.comfortauto.avtotickets.uz'
    });
  });

  it('still lists a trip whose carrier we do not recognise', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unknown = structuredClone(forward) as typeof forward;
    unknown.data[1].trips[0].api_id = 99;

    const trip = parseTrips(unknown, 'Urgench', 'Tashkent', '2026-08-19').trips[0];

    expect(trip.carrier).toBeNull();
    expect(trip.available).toBe(true);
    expect(error).toHaveBeenCalled();
  });
});

describe('price', () => {
  it('reads the fare upstream quotes', () => {
    expect(toTashkent().trips.map((t) => t.priceSum)).toEqual(Array(5).fill(240_000));
  });

  it('refuses a price outside the sanity band and marks the trip unbookable', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = structuredClone(forward) as typeof forward;
    // A tariff that silently changed units — structurally valid, wrong number.
    broken.data[1].trips[0].price = 240;

    const trip = parseTrips(broken, 'Urgench', 'Tashkent', '2026-08-19').trips[0];

    expect(trip.priceSum).toBeNull();
    expect(trip.available).toBe(false);
    expect(trip.unavailableReason).toBe('price_unreliable');
    expect(error).toHaveBeenCalled();
  });
});

describe('seat map', () => {
  it('reads the grid and the sold seats out of the envelope', () => {
    const map = parseSeatMap(seatmap, 61720);

    expect(map.seats).toHaveLength(51);
    expect(map.priceSum).toBe(240_000);
    expect(map.seats[0]).toEqual({
      id: 6791,
      number: 1,
      x: 21,
      y: 4,
      z: 1,
      type: 1,
      sold: true,
      gender: 'women'
    });
  });

  it('splits the seats by gender, because the API enforces it', () => {
    const map = parseSeatMap(seatmap, 61720);

    // A bus with free seats can still have none free for a given tourist.
    expect(map.seats.filter((s) => s.gender === 'men')).toHaveLength(21);
    expect(map.seats.filter((s) => s.gender === 'women')).toHaveLength(14);
    expect(map.seats.filter((s) => s.gender === null)).toHaveLength(16);
  });

  it('marks sold seats from the seat numbers, not a count', () => {
    const map = parseSeatMap(seatmap, 61720);

    expect(map.seats.filter((s) => s.sold)).toHaveLength(36);
    expect(map.seats.find((s) => s.number === 43)?.sold).toBe(true);
    expect(map.seats.find((s) => s.number === 44)?.sold).toBe(false);
  });

  it('does not throw on a payload that is nothing like a seat map', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const junk of [null, undefined, {}, {data: {}}]) {
      expect(parseSeatMap(junk, 1).seats).toEqual([]);
    }
    expect(error).toHaveBeenCalled();
  });
});
