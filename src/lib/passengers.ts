import {isCalendarDate} from '@/lib/dates';
import {isPassportCountry} from '@/lib/countries';

export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 4;

export type PartySize = 1 | 2 | 3 | 4;
export const PARTY_SIZES: readonly PartySize[] = [1, 2, 3, 4];

export type Gender = 'male' | 'female';

/** Exactly the fields the operator retypes into the railway's own form. */
export type PassengerDraft = {
  surname: string;
  firstName: string;
  birthDate: string;
  /** '' is "not answered yet". There is no sensible default to pick for someone. */
  gender: Gender | '';
  passportNumber: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
};

/** A draft that passed, normalised into the strings the operator will retype. */
export type Passenger = Omit<PassengerDraft, 'gender'> & {gender: Gender};

export type FieldError =
  | 'required'
  | 'latin_only'
  | 'too_long'
  | 'passport_format'
  | 'duplicate_passport'
  | 'birth_date_unreadable'
  | 'birth_date_future'
  | 'birth_date_too_old'
  | 'unknown_country'
  | 'email_unreadable';

export type PassengerErrors = Partial<Record<keyof PassengerDraft, FieldError>>;
export type PartyErrors = {passengers: PassengerErrors[]; email: FieldError | null};

export type PartyDraft = {passengers: PassengerDraft[]; email: string};
export type Party = {passengers: Passenger[]; email: string};

export type PartyResult = {status: 'ok'; party: Party} | ({status: 'invalid'} & PartyErrors);

const MAX_NAME_LENGTH = 40;
const MAX_EMAIL_LENGTH = 254;
const MAX_AGE_YEARS = 120;

// Passports print names in the Latin alphabet, unaccented, in the two
// machine-readable lines. Ü is UE there and É is E, so an accented letter is a
// question we cannot answer for the tourist — and the operator, retyping into a
// Latin-only railway field, has nothing but our text to go on.
const LATIN_NAME = /^[A-Za-z][A-Za-z '.-]*$/;

// Deliberately loose. Document formats vary by country and change over time, so
// a stricter rule would reject real passports we have no way to verify. This
// catches a phone number, an email or a half-typed field and nothing else.
const PASSPORT_NUMBER = /^[A-Z0-9]{5,15}$/;

// Pragmatic, not RFC-shaped: plus tags, long TLDs and unusual local parts are
// all real, and an over-strict pattern loses a paying customer to prove a point.
// The review screen printing the address back is the check that matters.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emptyPassenger(): PassengerDraft {
  return {surname: '', firstName: '', birthDate: '', gender: '', passportNumber: '', country: ''};
}

/**
 * Every error at once, never first-error-wins: somebody who fixes one field and
 * is immediately shown the next has been made to submit the form five times.
 *
 * `today` is injected rather than read from the clock, so this stays pure and so
 * the bound matches the Tashkent date the form's own max attribute uses.
 */
export function readParty(draft: PartyDraft, today: string): PartyResult {
  const passengers = draft.passengers.map((passenger) => normalise(passenger));
  const errors = passengers.map((passenger) => checkPassenger(passenger, today));

  flagDuplicatePassports(passengers, errors);

  const email = draft.email.trim();
  const emailError = checkEmail(email);

  const clean = errors.every((passenger) => Object.keys(passenger).length === 0);
  if (!clean || emailError) return {status: 'invalid', passengers: errors, email: emailError};

  return {
    status: 'ok',
    party: {passengers: passengers as Passenger[], email}
  };
}

function normalise(passenger: PassengerDraft): PassengerDraft {
  return {
    surname: collapse(passenger.surname),
    firstName: collapse(passenger.firstName),
    birthDate: passenger.birthDate.trim(),
    gender: passenger.gender,
    // Case and spacing are how a document is printed, not part of its number.
    passportNumber: passenger.passportNumber.replace(/\s+/g, '').toUpperCase(),
    country: passenger.country.trim().toUpperCase()
  };
}

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function checkPassenger(passenger: PassengerDraft, today: string): PassengerErrors {
  const errors: PassengerErrors = {};

  for (const field of ['surname', 'firstName'] as const) {
    const error = checkName(passenger[field]);
    if (error) errors[field] = error;
  }

  const birthDate = checkBirthDate(passenger.birthDate, today);
  if (birthDate) errors.birthDate = birthDate;

  if (!passenger.gender) errors.gender = 'required';

  if (!passenger.passportNumber) errors.passportNumber = 'required';
  else if (!PASSPORT_NUMBER.test(passenger.passportNumber)) errors.passportNumber = 'passport_format';

  if (!passenger.country) errors.country = 'required';
  else if (!isPassportCountry(passenger.country)) errors.country = 'unknown_country';

  return errors;
}

function checkName(value: string): FieldError | null {
  if (!value) return 'required';
  if (value.length > MAX_NAME_LENGTH) return 'too_long';
  if (!LATIN_NAME.test(value)) return 'latin_only';
  return null;
}

function checkBirthDate(value: string, today: string): FieldError | null {
  if (!value) return 'required';
  if (!isCalendarDate(value)) return 'birth_date_unreadable';
  if (value > today) return 'birth_date_future';
  // No minimum age: an infant has a passport and a date of birth, and inventing
  // a floor invents a rule the railway does not have.
  if (value < oldestBirthDate(today)) return 'birth_date_too_old';
  return null;
}

function oldestBirthDate(today: string): string {
  const [year, rest] = [Number(today.slice(0, 4)), today.slice(4)];
  return `${year - MAX_AGE_YEARS}${rest}`;
}

/**
 * Two rows carrying one document is always an error, and it is the one most
 * likely to reach the operator undetected — they would buy the same berth twice.
 * Flagged on the later row, where the tourist can see what it collides with.
 */
function flagDuplicatePassports(passengers: PassengerDraft[], errors: PassengerErrors[]): void {
  const seen = new Set<string>();

  passengers.forEach((passenger, index) => {
    const number = passenger.passportNumber;
    if (!number || errors[index].passportNumber) return;

    if (seen.has(number)) errors[index].passportNumber = 'duplicate_passport';
    else seen.add(number);
  });
}

function checkEmail(email: string): FieldError | null {
  if (!email) return 'required';
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL.test(email)) return 'email_unreadable';
  return null;
}
