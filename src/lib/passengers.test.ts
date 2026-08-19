import {describe, expect, it} from 'vitest';
import {emptyPassenger, readParty, type PassengerDraft, type PartyDraft} from './passengers';

// today is injected rather than read from the clock, so these stay pure.
const TODAY = '2026-08-19';

const adult: PassengerDraft = {
  surname: 'Novak',
  firstName: 'Ana',
  birthDate: '1991-04-02',
  gender: 'female',
  passportNumber: 'PB1234567',
  country: 'SI'
};

const party = (passengers: PassengerDraft[], email = 'ana@example.com'): PartyDraft => ({
  passengers,
  email
});

/** The one field under test, on an otherwise valid passenger. */
function errorFor(field: keyof PassengerDraft, value: string) {
  const result = readParty(party([{...adult, [field]: value}]), TODAY);
  return result.status === 'invalid' ? result.passengers[0][field] : undefined;
}

describe('readParty', () => {
  it('returns the party as the exact strings the operator will retype', () => {
    const result = readParty(party([adult]), TODAY);
    expect(result).toEqual({status: 'ok', party: {passengers: [adult], email: 'ana@example.com'}});
  });

  it('accepts the punctuation real passports print in a name', () => {
    expect(errorFor('surname', "O'Brien")).toBeUndefined();
    expect(errorFor('surname', 'Smith-Jones')).toBeUndefined();
    expect(errorFor('surname', 'St. John')).toBeUndefined();
  });

  it('refuses Cyrillic, because the railway prints back what we type', () => {
    expect(errorFor('surname', 'Новак')).toBe('latin_only');
  });

  it('refuses an accented letter rather than guessing the transliteration', () => {
    expect(errorFor('surname', 'Müller')).toBe('latin_only');
    expect(errorFor('firstName', 'José')).toBe('latin_only');
  });

  it('refuses a name longer than the railway form accepts', () => {
    expect(errorFor('surname', 'A'.repeat(41))).toBe('too_long');
    expect(errorFor('surname', 'A'.repeat(40))).toBeUndefined();
  });

  it('trims a pasted name instead of rejecting it for its whitespace', () => {
    const result = readParty(party([{...adult, surname: '  Van  Der  Berg  '}]), TODAY);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.party.passengers[0].surname).toBe('Van Der Berg');
  });

  it('uppercases a passport number and drops the spaces inside it', () => {
    const result = readParty(party([{...adult, passportNumber: 'pb 123 4567'}]), TODAY);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.party.passengers[0].passportNumber).toBe('PB1234567');
  });

  it('refuses a passport number holding punctuation, which is always a typo', () => {
    expect(errorFor('passportNumber', 'PB-123456')).toBe('passport_format');
    expect(errorFor('passportNumber', '+998901234567')).toBe('passport_format');
  });

  it('refuses a passport number too short or too long to be a document', () => {
    expect(errorFor('passportNumber', 'AB12')).toBe('passport_format');
    expect(errorFor('passportNumber', 'A'.repeat(16))).toBe('passport_format');
  });

  it('refuses a date of birth that is not a real day', () => {
    expect(errorFor('birthDate', '1991-02-31')).toBe('birth_date_unreadable');
    expect(errorFor('birthDate', '02.04.1991')).toBe('birth_date_unreadable');
  });

  it('refuses a date of birth in the future', () => {
    expect(errorFor('birthDate', '2026-08-20')).toBe('birth_date_future');
  });

  it('accepts today as a date of birth rather than inventing a minimum age', () => {
    expect(errorFor('birthDate', TODAY)).toBeUndefined();
  });

  it('refuses a date of birth more than 120 years ago', () => {
    expect(errorFor('birthDate', '1906-08-18')).toBe('birth_date_too_old');
    expect(errorFor('birthDate', '1906-08-19')).toBeUndefined();
  });

  it('refuses a country that is not one issuing passports', () => {
    expect(errorFor('country', 'XX')).toBe('unknown_country');
    expect(errorFor('country', 'AQ')).toBe('unknown_country');
  });

  it('accepts a country code however it was typed', () => {
    const result = readParty(party([{...adult, country: ' si '}]), TODAY);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.party.passengers[0].country).toBe('SI');
  });

  it('reports every empty field at once, so nobody fixes one and is shown the next', () => {
    const result = readParty({passengers: [emptyPassenger()], email: ''}, TODAY);
    expect(result).toEqual({
      status: 'invalid',
      email: 'required',
      passengers: [
        {
          surname: 'required',
          firstName: 'required',
          birthDate: 'required',
          gender: 'required',
          passportNumber: 'required',
          country: 'required'
        }
      ]
    });
  });

  it('reports the errors on every passenger, not only the first', () => {
    const result = readParty(
      party([{...adult, surname: ''}, {...adult, passportNumber: 'PB7654321', country: 'XX'}]),
      TODAY
    );
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.passengers[0]).toEqual({surname: 'required'});
      expect(result.passengers[1]).toEqual({country: 'unknown_country'});
    }
  });

  it('reports one passport number entered twice on the same order', () => {
    const second = {...adult, firstName: 'Luka', gender: 'male' as const};
    const result = readParty(party([adult, second]), TODAY);
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      // Flagged on the later row, where the tourist can see what it collides with.
      expect(result.passengers[0].passportNumber).toBeUndefined();
      expect(result.passengers[1].passportNumber).toBe('duplicate_passport');
    }
  });

  it('does not call two different passports a duplicate', () => {
    const second = {...adult, firstName: 'Luka', passportNumber: 'PB7654321'};
    expect(readParty(party([adult, second]), TODAY).status).toBe('ok');
  });

  it('accepts an address with a plus tag, which real inboxes use', () => {
    expect(readParty(party([adult], 'ana+uz@example.co.uk'), TODAY).status).toBe('ok');
  });

  it('refuses an address the ticket could not be sent to', () => {
    for (const address of ['ana', 'ana@', 'ana@example', 'a b@example.com']) {
      const result = readParty(party([adult], address), TODAY);
      expect(result.status === 'invalid' && result.email).toBe('email_unreadable');
    }
  });

  it('carries four passengers when four are given', () => {
    const four = [0, 1, 2, 3].map((n) => ({...adult, passportNumber: `PB123456${n}`}));
    const result = readParty(party(four), TODAY);
    expect(result.status === 'ok' && result.party.passengers).toHaveLength(4);
  });
});
