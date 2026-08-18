import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {clearCache} from '@/lib/cache';
import urgench from './__fixtures__/urgench-tashkent-2026-08-26.json';
import {UnknownStationError, searchTrains} from './index';

function stubUpstream() {
  const headers = new Headers();
  headers.append('set-cookie', 'XSRF-TOKEN=token-uuid; Path=/');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', {status: 200, headers}))
    .mockResolvedValueOnce(Response.json(urgench));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => clearCache());
afterEach(() => vi.unstubAllGlobals());

describe('searchTrains', () => {
  it('returns sold-out services present and unpriced alongside bookable ones', async () => {
    stubUpstream();

    const {value: trains, stale} = await searchTrains('Urgench', 'Tashkent', '2026-08-26');

    expect(stale).toBe(false);
    expect(trains.map((t) => [t.number, t.available])).toEqual([
      ['751М', true],
      ['126Ф', false],
      ['056Ж', false]
    ]);

    const bookable = trains[0];
    expect(bookable.classes).toEqual([
      {code: '2Е', priceSum: 750000, freeSeats: 27}
    ]);
    expect(bookable.origin).toBe('Urgench');
    expect(bookable.destination).toBe('Tashkent');
    expect(bookable.departure).toEqual({date: '2026-08-26', time: '07:40'});
    // Upstream's own figure, never one we computed.
    expect(bookable.timeOnWay).toBe('07:26');

    for (const soldOut of trains.slice(1)) {
      expect(soldOut.classes).toEqual([]);
      expect(soldOut.unavailableReason).toBe('sold_out');
      expect(soldOut.departure.time).toBeTruthy();
    }
  });

  it('makes one upstream search per route and date', async () => {
    const fetchMock = stubUpstream();

    await searchTrains('Urgench', 'Tashkent', '2026-08-26');
    await searchTrains('Urgench', 'Tashkent', '2026-08-26');

    // One csrf call plus one search, not two of each.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown city before any request is made', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchTrains('Nukus', 'Tashkent', '2026-08-26')).rejects.toThrow(
      UnknownStationError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed date before any request is made', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchTrains('Urgench', 'Tashkent', '26.08.2026')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
