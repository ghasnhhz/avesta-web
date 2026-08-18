import {describe, expect, it} from 'vitest';
import {
  COMMON_PASSPORT_COUNTRY_CODES,
  PASSPORT_COUNTRY_CODES,
  countryOptions,
  isPassportCountry
} from './countries';

describe('PASSPORT_COUNTRY_CODES', () => {
  it('lists every code exactly once', () => {
    expect(new Set(PASSPORT_COUNTRY_CODES).size).toBe(PASSPORT_COUNTRY_CODES.length);
  });

  it('holds only two-letter uppercase codes', () => {
    expect(PASSPORT_COUNTRY_CODES.filter((code) => !/^[A-Z]{2}$/.test(code))).toEqual([]);
  });

  it('leaves out territories no passport is issued by', () => {
    for (const uninhabited of ['AQ', 'BV', 'GS', 'HM', 'TF', 'UM']) {
      expect(isPassportCountry(uninhabited)).toBe(false);
    }
  });

  it('carries every country the common list floats to the top', () => {
    for (const code of COMMON_PASSPORT_COUNTRY_CODES) {
      expect(isPassportCountry(code)).toBe(true);
    }
  });

  it('refuses a code that is not on the list, whatever its shape', () => {
    expect(isPassportCountry('XX')).toBe(false);
    expect(isPassportCountry('uz')).toBe(false);
    expect(isPassportCountry('')).toBe(false);
  });
});

describe('countryOptions', () => {
  it('names a country in the locale it was asked for', () => {
    const options = countryOptions('en');
    expect(options.find((option) => option.code === 'DE')?.name).toBe('Germany');
  });

  it('offers every code once, common markets included', () => {
    const options = countryOptions('en');
    expect(options).toHaveLength(PASSPORT_COUNTRY_CODES.length);
    expect(new Set(options.map((option) => option.code)).size).toBe(options.length);
  });

  it('floats the countries we actually see above the rest', () => {
    const options = countryOptions('en');
    const head = options.slice(0, COMMON_PASSPORT_COUNTRY_CODES.length).map((o) => o.code);
    expect(new Set(head)).toEqual(new Set(COMMON_PASSPORT_COUNTRY_CODES));
  });

  it('sorts by the name on screen, not by the code behind it', () => {
    const rest = countryOptions('en').slice(COMMON_PASSPORT_COUNTRY_CODES.length);
    const names = rest.map((option) => option.name);
    expect(names).toEqual([...names].sort(new Intl.Collator('en').compare));
  });

  it('never leaves a country unnamed, because two letters answer nothing', () => {
    for (const locale of ['en', 'uz', 'ru']) {
      expect(countryOptions(locale).filter((option) => !option.name)).toEqual([]);
    }
  });

  it('names Uzbekistan, which is the passport the operator sees most', () => {
    expect(countryOptions('en').find((option) => option.code === 'UZ')?.name).toBe('Uzbekistan');
  });
});
