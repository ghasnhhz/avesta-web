import {describe, expect, it} from 'vitest';
import {parseStamp, toRequestDate} from './dates';

describe('rail dates', () => {
  it('parses the response format the request never uses', () => {
    expect(parseStamp('26.08.2026 01:10')).toEqual({
      date: '2026-08-26',
      time: '01:10',
      sortKey: '2026-08-26T01:10'
    });
  });

  it('keeps an overnight arrival on the following day', () => {
    expect(parseStamp('27.08.2026 05:23').date).toBe('2026-08-27');
  });

  it('sorts lexicographically in departure order', () => {
    const stamps = ['19.08.2026 22:35', '19.08.2026 01:10', '20.08.2026 03:30'];
    const sorted = stamps.map(parseStamp).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    expect(sorted.map((s) => s.sortKey)).toEqual([
      '2026-08-19T01:10',
      '2026-08-19T22:35',
      '2026-08-20T03:30'
    ]);
  });

  it('rejects a request date in the response format', () => {
    expect(() => toRequestDate('26.08.2026')).toThrow();
  });

  it('rejects a timestamp in the request format', () => {
    expect(() => parseStamp('2026-08-26 01:10')).toThrow();
  });
});
