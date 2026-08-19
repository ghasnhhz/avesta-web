// ISO 3166-1 alpha-2, officially assigned. Pinned rather than derived from
// Intl.getCanonicalLocales or a runtime region list: ICU data differs between
// Node versions and browsers, and a list that changes under us would render a
// different set of options on the server than on the client.
//
// Six officially assigned codes are left out because no person holds a passport
// issued by them: AQ, BV, GS, HM, TF and UM are uninhabited territories.
export const PASSPORT_COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR',
  'BS','BT','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM',
  'CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB',
  'GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GT','GU','GW',
  'GY','HK','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS',
  'IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY',
  'KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD',
  'ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU',
  'MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR',
  'NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT',
  'PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH',
  'SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC',
  'TD','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA',
  'UG','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT',
  'ZA','ZM','ZW'
] as const;

/** The handful of passports we actually see, floated above the full list. */
export const COMMON_PASSPORT_COUNTRY_CODES = [
  'UZ','GB','US','DE','FR','IT','ES','NL','PL','JP','KR','CN','IN','RU','KZ'
] as const;

export type CountryOption = {code: string; name: string};

const CODES: ReadonlySet<string> = new Set(PASSPORT_COUNTRY_CODES);

export function isPassportCountry(value: string): boolean {
  return CODES.has(value);
}

/**
 * Localised and collated for one locale, common source markets first. Called on
 * the server, where the locale is already known: naming the countries in the
 * client would risk a different ICU build answering differently than the one
 * that rendered the HTML.
 */
export function countryOptions(locale: string): CountryOption[] {
  const name = countryNamer(locale);
  const collator = new Intl.Collator(locale);
  const common = new Set<string>(COMMON_PASSPORT_COUNTRY_CODES);

  const sorted = (codes: readonly string[]) =>
    codes.map((code) => ({code, name: name(code)})).sort((a, b) => collator.compare(a.name, b.name));

  return [
    ...sorted(COMMON_PASSPORT_COUNTRY_CODES),
    ...sorted(PASSPORT_COUNTRY_CODES.filter((code) => !common.has(code)))
  ];
}

/**
 * Locale, then English, then the bare code. Uzbek region names are thin in ICU
 * and "MV" alone is not an answer to "who issued your passport" — the English
 * name is a worse answer than the localised one and a far better answer than
 * two letters.
 */
function countryNamer(locale: string): (code: string) => string {
  const localised = displayNames(locale);
  const english = locale === 'en' ? null : displayNames('en');

  return (code) => localised?.of(code) ?? english?.of(code) ?? code;
}

function displayNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], {type: 'region', fallback: 'none'});
  } catch {
    return null;
  }
}
