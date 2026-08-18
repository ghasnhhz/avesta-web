import {describe, expect, it} from 'vitest';
import {BUS_CITIES, UnknownLocationError, assertBusCity, isBusCity, locationId} from './locations';

describe('the location table', () => {
  it('answers for every city it lists', () => {
    for (const city of BUS_CITIES) {
      expect(isBusCity(city)).toBe(true);
      expect(locationId(city)).toBeGreaterThan(0);
    }
  });

  it('holds the codes recovered from upstream', () => {
    expect(locationId('Tashkent')).toBe(1726);
    expect(locationId('Urgench')).toBe(1733217);
    // Khiva is reached directly, not via Urgench.
    expect(locationId('Khiva')).toBe(1733226);
  });

  it('never returns a trip-record id, which lives in the other ID space', () => {
    // 314 and 298 are Urgench and Tashkent as trip records name them. A search
    // sent those codes returns nothing rather than an error, so the two spaces
    // must not overlap anywhere in this table.
    const codes = BUS_CITIES.map(locationId);
    expect(codes).not.toContain(314);
    expect(codes).not.toContain(298);
  });

  it('throws on a city it has no code for, rather than reaching upstream', () => {
    expect(() => assertBusCity('Nukus')).toThrow(UnknownLocationError);
    expect(() => assertBusCity('Urgench')).not.toThrow();
  });
});
