import 'server-only';

// Search is answered by the aggregator; seat maps live on the carrier's own
// host. Two endpoints on these hosts are permanently off limits, per CLAUDE.md
// rule 6: check-reserved-seats and clear-on-process are the booking lock and the
// site polls the first every few seconds.
const AGGREGATOR = 'https://wapi.avtoticket.uz';

function userAgent(): string {
  return process.env.BUS_USER_AGENT ?? 'AvestaBot/0.1 (+https://avesta.uz/contact)';
}

export class BusUpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'BusUpstreamError';
  }
}

function headers(): HeadersInit {
  const token = process.env.BUS_API_TOKEN;

  return {
    Accept: 'application/json',
    // Verified 2026-08-18: the key is not required. The same request returns an
    // identical 200 with a valid key, with no Authorization header, and with a
    // corrupted one. We still send it when we have it rather than pretend to be
    // an anonymous caller, but its absence is not a failure.
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    'Content-Type': 'application/json',
    'User-Agent': userAgent()
  };
}

/**
 * Upstream answers 403 to server-to-server calls — "requests are only allowed
 * from avtoticket.uz" — before it looks at the token. That is a deliberate
 * block, so the status is surfaced as-is and no Origin or Referer is forged.
 */
async function request(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {...init, headers: headers(), cache: 'no-store'});

  if (!response.ok) {
    throw new BusUpstreamError(`${url} failed`, response.status);
  }

  const payload = await response.json();
  if ((payload as {success?: unknown})?.success === false) {
    throw new BusUpstreamError(`${url} returned success: false`);
  }

  return payload;
}

/** Valid destinations from a city — a route map, not a full city list. */
export async function fetchLocations(cityId: number): Promise<unknown> {
  return request(`${AGGREGATOR}/api/api-locations/${cityId}`);
}

export async function fetchTrips(date: string, from: number, to: number): Promise<unknown> {
  // days: 1 asks for the requested date alone. A wider window returns shoulder
  // dates as counts with empty trip arrays and costs upstream more work.
  return request(`${AGGREGATOR}/api/api-trips`, {
    method: 'POST',
    body: JSON.stringify({date, from, to, days: 1})
  });
}

/** Read-only. IDs here are the trip-record space (314/298), never search codes. */
export async function fetchSeatMap(
  host: string,
  fromId: number,
  toId: number,
  tripId: number
): Promise<unknown> {
  return request(`${host}/api/bus/${fromId}/${toId}/${tripId}`);
}
