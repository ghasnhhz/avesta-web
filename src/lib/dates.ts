// Journey dates for display and for the search form. The wire formats live in
// src/lib/sources/*/dates.ts — this file never touches upstream strings.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Noon UTC, not midnight. `new Date('2026-08-26')` is midnight UTC and renders as
 * 25 Aug anywhere west of Greenwich. Noon holds the date from UTC-12 to UTC+11,
 * which covers every zone the app is formatted in — next-intl pins display to
 * Asia/Tashkent (UTC+5). It would still slip in UTC+13/+14, which is why the zone
 * is pinned rather than left to the server.
 */
export function journeyDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

/**
 * Shape and reality: 2026-02-31 has the right shape and is not a day. Named for
 * the calendar rather than the journey — it also vets dates of birth, which are
 * the same question asked about the past.
 */
export function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Uzbekistan's today, not the server's. Between 19:00 and 24:00 UTC a Vercel box
 * would otherwise offer a date that is already yesterday in Tashkent. en-CA
 * formats as YYYY-MM-DD, which is the shape every search takes.
 */
export function todayInTashkent(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Tashkent'}).format(now);
}

/**
 * Whole days between two published dates — the "+1" on an arrival after
 * midnight. Not a duration: no hours or minutes are derived here, and the two
 * dates are both upstream's own (CLAUDE.md rule 8).
 */
export function dayOffset(fromIso: string, toIso: string): number {
  const ms = journeyDate(toIso).getTime() - journeyDate(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}
