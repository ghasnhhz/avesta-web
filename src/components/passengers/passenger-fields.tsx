'use client';

import {useTranslations} from 'next-intl';
import {Field, fieldErrorStyle, fieldStyle} from '@/components/ui/field';
import type {CountryOption} from '@/lib/countries';
import type {FieldError, Gender, PassengerDraft, PassengerErrors} from '@/lib/passengers';

/** The message key naming each field, so the summary and the field itself agree. */
export const FIELD_LABEL: Record<keyof PassengerDraft, string> = {
  surname: 'names.surname',
  firstName: 'names.firstName',
  birthDate: 'birthDate',
  gender: 'gender.legend',
  passportNumber: 'passportNumber',
  country: 'country'
};

/** Deterministic, because the error summary links to these from elsewhere. */
export function fieldId(index: number, field: keyof PassengerDraft): string {
  return `passenger-${index}-${field}`;
}

export const cardStyle = 'rounded-lg border border-border bg-surface p-5 sm:p-6';

const legendStyle = 'mb-4 flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1';

const quietButtonStyle =
  'inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';

const genderStyle =
  'flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors duration-200 hover:border-accent has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent';

const inputClass = (invalid: boolean) => `${fieldStyle} ${invalid ? fieldErrorStyle : ''}`;

type Props = {
  index: number;
  draft: PassengerDraft;
  errors: PassengerErrors;
  countries: CountryOption[];
  /** How many of `countries` are the common ones held at the front of the list. */
  commonCount: number;
  /** Tashkent's today, from the server, so the ceiling cannot shift on hydration. */
  today: string;
  removable: boolean;
  onChange: (patch: Partial<PassengerDraft>) => void;
  onRemove: () => void;
};

export function PassengerFields({
  index,
  draft,
  errors,
  countries,
  commonCount,
  today,
  removable,
  onChange,
  onRemove
}: Props) {
  const t = useTranslations('passengers');
  const message = useErrorMessage();
  const id = (field: keyof PassengerDraft) => fieldId(index, field);

  return (
    <fieldset className={cardStyle}>
      <legend className={legendStyle}>
        <span className="font-serif text-xl tracking-tight">
          {t('passenger', {number: index + 1})}
        </span>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('removeLabel', {number: index + 1})}
            className={quietButtonStyle}
          >
            {t('remove')}
          </button>
        ) : null}
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id('surname')} label={t('names.surname')} error={message(errors.surname)}>
          {({id: inputId, describedBy, invalid}) => (
            <input
              id={inputId}
              name={inputId}
              type="text"
              value={draft.surname}
              onChange={(event) => onChange({surname: event.target.value})}
              autoComplete="family-name"
              autoCapitalize="characters"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass(invalid)}
            />
          )}
        </Field>

        <Field
          id={id('firstName')}
          label={t('names.firstName')}
          error={message(errors.firstName)}
        >
          {({id: inputId, describedBy, invalid}) => (
            <input
              id={inputId}
              name={inputId}
              type="text"
              value={draft.firstName}
              onChange={(event) => onChange({firstName: event.target.value})}
              autoComplete="given-name"
              autoCapitalize="characters"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass(invalid)}
            />
          )}
        </Field>

        <Field id={id('birthDate')} label={t('birthDate')} error={message(errors.birthDate)}>
          {({id: inputId, describedBy, invalid}) => (
            <input
              id={inputId}
              name={inputId}
              type="date"
              value={draft.birthDate}
              onChange={(event) => onChange({birthDate: event.target.value})}
              max={today}
              autoComplete="bday"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass(invalid)}
            />
          )}
        </Field>

        <GenderChoice
          id={id('gender')}
          value={draft.gender}
          error={message(errors.gender)}
          onChange={(gender) => onChange({gender})}
        />

        <Field
          id={id('passportNumber')}
          label={t('passportNumber')}
          hint={t('passportHint')}
          error={message(errors.passportNumber)}
        >
          {({id: inputId, describedBy, invalid}) => (
            <input
              id={inputId}
              name={inputId}
              type="text"
              value={draft.passportNumber}
              onChange={(event) => onChange({passportNumber: event.target.value})}
              // A passport number is not a word and is not a value a browser
              // should be remembering for a site.
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass(invalid)}
            />
          )}
        </Field>

        <Field id={id('country')} label={t('country')} error={message(errors.country)}>
          {({id: inputId, describedBy, invalid}) => (
            <select
              id={inputId}
              name={inputId}
              value={draft.country}
              onChange={(event) => onChange({country: event.target.value})}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={inputClass(invalid)}
            >
              <option value="">{t('chooseCountry')}</option>
              {/* Grouped, not merely sorted: a list that runs alphabetically
                  twice over reads as a bug rather than as a shortcut. */}
              <optgroup label={t('countryGroups.common')}>
                {countries.slice(0, commonCount).map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t('countryGroups.all')}>
                {countries.slice(commonCount).map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </Field>
      </div>
    </fieldset>
  );
}

/**
 * Two radios rather than a select: there are two answers and both should be
 * visible. The hint says whose rule this is, rather than implying a view.
 */
function GenderChoice({
  id,
  value,
  error,
  onChange
}: {
  id: string;
  value: Gender | '';
  error?: string;
  onChange: (gender: Gender) => void;
}) {
  const t = useTranslations('passengers.gender');
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <fieldset id={id} aria-describedby={error ? `${hintId} ${errorId}` : hintId}>
      <legend className="mb-1.5 text-sm text-muted">{t('legend')}</legend>
      <p id={hintId} className="mb-1.5 text-sm text-muted">
        {t('hint')}
      </p>

      <div className="flex gap-2">
        {(['male', 'female'] as const).map((gender) => (
          <label key={gender} className={genderStyle}>
            <input
              type="radio"
              name={id}
              value={gender}
              checked={value === gender}
              onChange={() => onChange(gender)}
              className="size-5 shrink-0 cursor-pointer accent-accent"
            />
            <span>{t(gender)}</span>
          </label>
        ))}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function useErrorMessage() {
  const t = useTranslations('passengers');

  // Beside the field its own label already names it. The summary, read away
  // from the fields, adds the name itself.
  return (error: FieldError | undefined) => (error ? t(`errors.${error}`) : undefined);
}
