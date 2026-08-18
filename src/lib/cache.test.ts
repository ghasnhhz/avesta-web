import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cached, clearCache} from './cache';

beforeEach(() => clearCache());
afterEach(() => vi.restoreAllMocks());

describe('short-ttl cache', () => {
  it('makes one upstream call for repeated searches of the same key', async () => {
    const fetcher = vi.fn().mockResolvedValue('trains');

    await cached('urgench:tashkent:2026-08-26', fetcher);
    await cached('urgench:tashkent:2026-08-26', fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('collapses concurrent misses into one call', async () => {
    const fetcher = vi.fn().mockResolvedValue('trains');

    await Promise.all([cached('k', fetcher), cached('k', fetcher), cached('k', fetcher)]);

    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('refetches a different route', async () => {
    const fetcher = vi.fn().mockResolvedValue('trains');

    await cached('a', fetcher);
    await cached('b', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves stale and says so when upstream fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('trains')
      .mockRejectedValueOnce(new Error('502'));

    const fresh = await cached('k', fetcher, 0);
    const stale = await cached('k', fetcher, 0);

    expect(fresh.stale).toBe(false);
    expect(stale).toMatchObject({value: 'trains', stale: true});
  });

  it('propagates the error when there is nothing to fall back to', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('502'));

    await expect(cached('cold', fetcher)).rejects.toThrow('502');
  });
});
