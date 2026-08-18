// Short TTL, one upstream call per unique key. Availability drifts within
// minutes, so a long cache would quote a berth that is already gone; N tourists
// searching the same route in the same minute must still be one request.
const DEFAULT_TTL_MS = 60_000;

type Entry<T> = {value: T; expiresAt: number};

const store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export type Cached<T> = {value: T; fetchedAt: number; stale: boolean};

/**
 * Serves a fresh value, otherwise fetches. On upstream failure a stale value is
 * served labelled stale rather than thrown away — the results header shows the
 * warning. With nothing cached, the error propagates.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<Cached<T>> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && hit.expiresAt > now) {
    return {value: hit.value, fetchedAt: hit.expiresAt - ttlMs, stale: false};
  }

  // Collapse concurrent misses so a burst of searches is still one call.
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return {value: await pending, fetchedAt: now, stale: false};

  const promise = fetcher();
  inFlight.set(key, promise);

  try {
    const value = await promise;
    store.set(key, {value, expiresAt: Date.now() + ttlMs});
    return {value, fetchedAt: Date.now(), stale: false};
  } catch (error) {
    if (hit) {
      console.error(`[cache] ${key} failed, serving stale:`, error);
      return {value: hit.value, fetchedAt: hit.expiresAt - ttlMs, stale: true};
    }
    throw error;
  } finally {
    inFlight.delete(key);
  }
}

export function clearCache(): void {
  store.clear();
  inFlight.clear();
}
