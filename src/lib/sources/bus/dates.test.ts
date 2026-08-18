import {describe, expect, it} from 'vitest';
import {parseStamp, toRequestDate} from './dates';

describe('request dates', () => {
  it('passes an ISO date through and rejects anything else', () => {
    expect(toRequestDate('2026-08-19')).toBe('2026-08-19');
    expect(() => toRequestDate('19.08.2026')).toThrow();
  });
});

describe('response stamps', () => {
  it('keeps upstream wall-clock time as it is, with no timezone shift', () => {
    expect(parseStamp('2026-08-19 13:00:00')).toEqual({
      date: '2026-08-19',
      time: '13:00',
      sortKey: '2026-08-19T13:00'
    });
  });

  it('returns null instead of throwing, so one bad arrival does not lose a trip', () => {
    for (const junk of [null, undefined, '', 'tomorrow', '2026-08-19', 42]) {
      expect(parseStamp(junk)).toBeNull();
    }
  });
});
