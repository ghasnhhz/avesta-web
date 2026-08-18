import 'server-only';

const BASE = 'https://eticket.railway.uz';

// A WAF rejects some clients by User-Agent. We identify ourselves truthfully and
// never impersonate a browser — a block is a finding to report, not to defeat.
function userAgent(): string {
  return process.env.RAIL_USER_AGENT ?? 'AvestaBot/0.1 (+https://avesta.uz/contact)';
}

export class RailUpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'RailUpstreamError';
  }
}

/**
 * The cookie and the header must carry the same token or the search 400s, so
 * both come from one call.
 */
async function csrfToken(): Promise<string> {
  const response = await fetch(`${BASE}/api/v1/csrf-token`, {
    headers: {'Accept-Language': 'en', 'User-Agent': userAgent()},
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new RailUpstreamError('CSRF token request failed', response.status);
  }

  const cookies = response.headers.getSetCookie();
  const token = cookies.join(';').match(/XSRF-TOKEN=([^;]+)/)?.[1];

  if (!token) throw new RailUpstreamError('No XSRF-TOKEN cookie in the response');
  return decodeURIComponent(token);
}

export async function fetchTrainList(
  date: string,
  depStationCode: string,
  arvStationCode: string
): Promise<unknown> {
  const token = await csrfToken();

  const response = await fetch(`${BASE}/api/v3/handbook/trains/list`, {
    method: 'POST',
    headers: {
      // Without Accept-Language the endpoint 400s.
      'Accept-Language': 'en',
      'Content-Type': 'application/json',
      Cookie: `XSRF-TOKEN=${token}`,
      'X-XSRF-TOKEN': token,
      'User-Agent': userAgent()
    },
    body: JSON.stringify({directions: {forward: {date, depStationCode, arvStationCode}}}),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new RailUpstreamError('Train list request failed', response.status);
  }

  return response.json();
}
