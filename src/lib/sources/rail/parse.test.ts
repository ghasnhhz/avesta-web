import {afterEach, describe, expect, it, vi} from 'vitest';
import empty from './__fixtures__/urgench-tashkent-2027-06-01.json';
import samarkand from './__fixtures__/tashkent-samarkand-2026-08-19.json';
import urgench from './__fixtures__/urgench-tashkent-2026-08-26.json';
import {parseTrains} from './parse';

afterEach(() => vi.restoreAllMocks());

const fromUrgench = () => parseTrains(urgench, 'Urgench', 'Tashkent');
const fromTashkent = () => parseTrains(samarkand, 'Tashkent', 'Samarkand');

describe('no trains', () => {
  it('returns an empty list when the forward key is absent', () => {
    expect(parseTrains(empty, 'Urgench', 'Tashkent')).toEqual([]);
  });

  it('does not throw on a payload that is nothing like a response', () => {
    for (const junk of [null, undefined, {}, {data: {}}, {data: {directions: {}}}]) {
      expect(parseTrains(junk, 'Urgench', 'Tashkent')).toEqual([]);
    }
  });
});

describe('sold out', () => {
  it('lists sold-out trains with their times and no price', () => {
    const soldOut = fromUrgench().filter((t) => !t.available);

    expect(soldOut.map((t) => t.number)).toEqual(['126Ф', '056Ж']);
    for (const train of soldOut) {
      expect(train.unavailableReason).toBe('sold_out');
      expect(train.classes).toEqual([]);
      expect(train.departure.time).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('keeps every sold-out service in the list rather than hiding it', () => {
    const trains = fromTashkent();
    expect(trains).toHaveLength(17);
    expect(trains.filter((t) => !t.available)).toHaveLength(6);
  });
});

describe('ordering', () => {
  it('sorts by departure, since upstream appends sold-out services last', () => {
    const trains = fromTashkent();
    const keys = trains.map((t) => t.sortKey);

    expect([...keys].sort((a, b) => a.localeCompare(b))).toEqual(keys);
    // 127Ф at 01:10 is returned last, after 125Ч at 22:35, because it is sold
    // out. It belongs second, behind 124Ф at 00:10.
    expect(trains.slice(0, 2).map((t) => t.number)).toEqual(['124Ф', '127Ф']);
  });
});

describe('prices and seats', () => {
  it('reads per-class counts on a seated car rather than the car total', () => {
    const train = fromTashkent().find((t) => t.number === '712Ф')!;

    expect(train.classes.map((c) => [c.code, c.priceSum, c.freeSeats])).toEqual([
      ['1С', 300560, 24],
      ['1С', 300560, 25],
      ['1В', 566450, 9],
      ['2В', 200060, 95]
    ]);
    // The car reports 153 — the sum across four differently priced classes.
    expect(train.classes.reduce((n, c) => n + (c.freeSeats ?? 0), 0)).toBe(153);
  });

  it('falls back to the car total on a berth car, which reports 0 per tariff', () => {
    const train = fromTashkent().find((t) => t.number === '124Ф')!;

    expect(train.classes.map((c) => [c.code, c.freeSeats])).toEqual([
      ['3Л', 35],
      ['2У', 2]
    ]);
  });

  it('marks a train unbookable when every price fails the sanity band', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = structuredClone(urgench) as typeof urgench;
    // A tariff that silently changed units — structurally valid, wrong number.
    broken.data.directions.forward.trains[0].cars[0].tariffs[0].tariff = 750;

    const train = parseTrains(broken, 'Urgench', 'Tashkent')[0];
    expect(train.available).toBe(false);
    expect(train.unavailableReason).toBe('price_unreliable');
    expect(train.classes).toEqual([]);
    expect(error).toHaveBeenCalled();
  });
});

describe('berth preference', () => {
  it('surfaces up and down counts on berth classes', () => {
    const train = fromTashkent().find((t) => t.number === '054Ф')!;

    expect(train.classes[0].berths).toEqual({up: 11, down: 1, lateralUp: 7, lateralDn: 6});
  });

  it('leaves berths off seated classes', () => {
    const train = fromTashkent().find((t) => t.number === '710Ф')!;
    for (const cls of train.classes) expect(cls.berths).toBeUndefined();
  });

  it('never treats seatDetail as an integrity check on freeSeats', () => {
    // 082Ф СВ: freeComp is 2 free compartments, not berths. Counting it would
    // report 6 seats where the car says 4.
    const train = fromTashkent().find((t) => t.number === '082Ф')!;
    const sv = train.classes.find((c) => c.code === '1Л')!;

    expect(sv.freeSeats).toBe(4);
    expect(sv.berths).toEqual({up: 0, down: 4, lateralUp: 0, lateralDn: 0});
  });
});

describe('accommodation', () => {
  it('names the accommodation from the car the class sits in', () => {
    const train = fromTashkent().find((t) => t.number === '082Ф')!;

    expect(train.classes.map((c) => [c.code, c.accommodation])).toEqual([
      ['3П', 'platskart'],
      ['2К', 'kupe'],
      ['1Л', 'sv']
    ]);
  });

  it('reads the Uzbek car type upstream returns under Accept-Language: en', () => {
    // 751М comes back as "O'rindiqli" where the same request elsewhere says
    // "Сидячий" — the localisation is inconsistent, not the accommodation.
    const seated = fromUrgench()
      .flatMap((t) => t.classes)
      .filter((c) => c.code === '2Е');

    expect(seated.length).toBeGreaterThan(0);
    for (const cls of seated) expect(cls.accommodation).toBe('seated');
  });

  it('reads the English car types upstream started returning', () => {
    // Captured 2026-08-19: the same request that returned "Плацкартный" and
    // "O'rindiqli" on other days answered "Sleeper", "Coupe", "SV", "Sitting"
    // and "General". The accommodation did not change; the spelling did.
    const english = structuredClone(samarkand) as typeof samarkand;
    const cars = english.data.directions.forward.trains[7].cars;
    [cars[0].type, cars[1].type, cars[2].type] = ['Sleeper', 'Coupe', 'SV'];

    const train = parseTrains(english, 'Tashkent', 'Samarkand').find((t) => t.number === '082Ф')!;

    expect(train.classes.map((c) => c.accommodation)).toEqual(['platskart', 'kupe', 'sv']);
  });

  it('names nothing rather than guessing at a car type we have not seen', () => {
    const unknown = structuredClone(urgench) as typeof urgench;
    unknown.data.directions.forward.trains[0].cars[0].type = 'Спальный вагон люкс';

    expect(parseTrains(unknown, 'Urgench', 'Tashkent')[0].classes[0].accommodation).toBeNull();
  });
});

describe('upstream text', () => {
  it('keeps Cyrillic in numbers and class codes intact', () => {
    const codes = fromTashkent().flatMap((t) => t.classes.map((c) => c.code));

    expect(codes).toContain('3П');
    expect(codes).toContain('2К');
    expect(fromTashkent().map((t) => t.number)).toContain('124Ф');
  });

  it('folds Latin lookalikes so one train type is not split in two', () => {
    const types = new Set(fromTashkent().map((t) => t.type));

    // Upstream returns both "СК" (Cyrillic) and "CK" (Latin) in this response.
    expect(types.has('СК')).toBe(true);
    expect([...types].some((t) => /[A-Z]/.test(t))).toBe(false);
  });
});

describe('subRoute', () => {
  it('drops a train whose quoted leg is not the leg requested', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrong = structuredClone(urgench) as typeof urgench;
    wrong.data.directions.forward.trains[0].subRoute.arvStationCode = '2900700';

    expect(parseTrains(wrong, 'Urgench', 'Tashkent')).toHaveLength(2);
    expect(error).toHaveBeenCalledOnce();
  });

  it('returns nothing when the whole response is for another route', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(parseTrains(urgench, 'Tashkent', 'Samarkand')).toEqual([]);
    expect(error).toHaveBeenCalledTimes(3);
  });
});
