import {describe, expect, it} from 'vitest';
import {
  RAIL_CITIES,
  UnknownStationError,
  isRailCity,
  requireStationCode
} from './stations';

describe('rail stations', () => {
  it('resolves the verified codes', () => {
    expect(requireStationCode('Tashkent')).toBe('2900000');
    expect(requireStationCode('Urgench')).toBe('2900790');
    expect(requireStationCode('Khiva')).toBe('2900172');
  });

  it('throws on an unknown city rather than sending a code upstream', () => {
    expect(() => requireStationCode('Nukus')).toThrow(UnknownStationError);
  });

  it('rejects a station code passed where a city belongs', () => {
    expect(isRailCity('2900000')).toBe(false);
  });

  it('gives every city a distinct code', () => {
    const codes = RAIL_CITIES.map(requireStationCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
