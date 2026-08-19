import {type PassengerDraft, type PartyDraft, MAX_PASSENGERS, emptyPassenger} from '@/lib/passengers';

const KEY = 'avesta.passengers';

/**
 * Two hours. sessionStorage already dies with the tab, so this is for the tab
 * that does not die: a hotel lobby machine, a phone handed to somebody else, a
 * browser left open overnight. What is held here is passport numbers and dates
 * of birth, and there is no version of "a bit longer" worth that.
 */
export const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

type Stored = {savedAt: number; draft: PartyDraft};

/**
 * sessionStorage rather than a cookie, a query string or a server round trip:
 * it is same-origin, it is never attached to a request, and it does not reach
 * browser history, a Referer header or an access log. A dropped hotel wifi
 * costing four retyped passports is a real cost; so is a passport number in a
 * URL. This is the option with neither.
 *
 * Every function tolerates storage being unavailable — Safari's private mode
 * throws on access, and losing a convenience is not a reason to lose the form.
 */
export function readDraft(storage: Storage | undefined, now: number): PartyDraft | null {
  const raw = attempt(() => storage?.getItem(KEY));
  if (!raw) return null;

  const stored = parse(raw);
  if (!stored || now - stored.savedAt > DRAFT_TTL_MS) {
    clearDraft(storage);
    return null;
  }

  return stored.draft;
}

export function writeDraft(storage: Storage | undefined, draft: PartyDraft, now: number): void {
  attempt(() => storage?.setItem(KEY, JSON.stringify({savedAt: now, draft} satisfies Stored)));
}

export function clearDraft(storage: Storage | undefined): void {
  attempt(() => storage?.removeItem(KEY));
}

/**
 * Anything that is not exactly the shape we wrote is discarded rather than
 * repaired. A half-restored passenger is worse than an empty form: the tourist
 * would have to notice which field we lost.
 */
function parse(raw: string): Stored | null {
  const value = attempt(() => JSON.parse(raw) as unknown);
  if (!isRecord(value) || typeof value.savedAt !== 'number') return null;

  const draft = value.draft;
  if (!isRecord(draft) || typeof draft.email !== 'string') return null;
  if (!Array.isArray(draft.passengers)) return null;
  if (draft.passengers.length < 1 || draft.passengers.length > MAX_PASSENGERS) return null;
  if (!draft.passengers.every(isPassengerDraft)) return null;

  return {
    savedAt: value.savedAt,
    draft: {passengers: draft.passengers as PassengerDraft[], email: draft.email}
  };
}

function isPassengerDraft(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.keys(emptyPassenger()).every((field) => typeof value[field] === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function attempt<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}
