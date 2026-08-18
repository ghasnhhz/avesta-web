// The request takes 2026-08-26; the response returns 26.08.2026 01:10. Both
// directions are needed on every search.

const REQUEST_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RESPONSE_STAMP = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;

export function toRequestDate(isoDate: string): string {
  if (!REQUEST_DATE.test(isoDate)) {
    throw new Error(`Rail search date must be YYYY-MM-DD, got "${isoDate}"`);
  }
  return isoDate;
}

/**
 * The railway publishes local Tashkent time with no offset. We keep it as the
 * wall-clock string it is and expose the parts, rather than building a Date in
 * the server's zone and quietly shifting every departure by an hour.
 */
export function parseStamp(stamp: string): {
  date: string;
  time: string;
  sortKey: string;
} {
  const match = RESPONSE_STAMP.exec(stamp);
  if (!match) throw new Error(`Unrecognised rail timestamp "${stamp}"`);

  const [, day, month, year, hour, minute] = match;
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    sortKey: `${year}-${month}-${day}T${hour}:${minute}`
  };
}
