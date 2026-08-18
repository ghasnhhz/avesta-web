import {describe, expect, it} from 'vitest';
import {
  RAIL_CITIES,
  UnknownStationError,
  assertRailCity,
  isRailCity,
  stationCode
} from './stations';

describe('rail stations', () => {
  it('resolves the verified codes', () => {
    expect(stationCode(assertRailCity('Tashkent'))).toBe('2900000');
    expect(stationCode(assertRailCity('Urgench'))).toBe('2900790');
    expect(stationCode(assertRailCity('Khiva'))).toBe('2900172');
  });

  it('throws on an unknown city rather than sending a code upstream', () => {
    expect(() => assertRailCity('Nukus')).toThrow(UnknownStationError);
  });

  it('rejects a station code passed where a city belongs', () => {
    expect(isRailCity('2900000')).toBe(false);
  });

  it('gives every city a distinct code', () => {
    const codes = RAIL_CITIES.map(stationCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
