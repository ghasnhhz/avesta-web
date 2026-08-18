// The request takes 2026-08-19; the response returns "2026-08-19 13:00:00".
// Upstream publishes local time with no offset, so it stays a wall-clock string
// — building a Date here would shift every departure by the server's zone.

const REQUEST_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RESPONSE_STAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):\d{2}$/;

export function toRequestDate(isoDate: string): string {
  if (!REQUEST_DATE.test(isoDate)) {
    throw new Error(`Bus search date must be YYYY-MM-DD, got "${isoDate}"`);
  }
  return isoDate;
}

/** Null rather than a throw: one unreadable arrival must not lose the trip. */
export function parseStamp(stamp: unknown): {date: string; time: string; sortKey: string} | null {
  if (typeof stamp !== 'string') return null;

  const match = RESPONSE_STAMP.exec(stamp);
  if (!match) return null;

  const [, date, hour, minute] = match;
  return {date, time: `${hour}:${minute}`, sortKey: `${date}T${hour}:${minute}`};
}
