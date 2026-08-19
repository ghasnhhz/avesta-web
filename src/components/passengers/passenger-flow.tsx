'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {ErrorSummary} from '@/components/passengers/error-summary';
import {PassengerFields, cardStyle} from '@/components/passengers/passenger-fields';
import {Review} from '@/components/passengers/review';
import {Field, fieldErrorStyle, fieldStyle} from '@/components/ui/field';
import type {BerthPreference} from '@/lib/choice-params';
import type {CountryOption} from '@/lib/countries';
import {clearDraft, readDraft, writeDraft} from '@/lib/passenger-draft';
import {
  MAX_PASSENGERS,
  type Party,
  type PartyDraft,
  type PartyErrors,
  type PassengerDraft,
  emptyPassenger,
  readParty
} from '@/lib/passengers';
import type {PartyQuote} from '@/lib/pricing';
import type {Accommodation} from '@/lib/sources/rail';

type Props = {
  countries: CountryOption[];
  commonCount: number;
  /** Tashkent's today, from the server: a render either side of midnight in the
      client would otherwise disagree with the server about the date ceiling. */
  today: string;
  /** Priced on the server for every party size, so the client never multiplies money. */
  quotes: PartyQuote[];
  feePercent: number;
  classCode: string;
  accommodation: Accommodation | null;
  berth: BerthPreference | null;
};

const EMAIL_ID = 'contact-email';

const primaryButtonStyle =
  'min-h-11 w-full cursor-pointer rounded-md bg-accent px-5 py-3 font-medium text-on-accent transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto';

const secondaryButtonStyle =
  'min-h-11 w-full cursor-pointer rounded-md border border-border px-5 py-3 transition-colors duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto';

const quietButtonStyle =
  'inline-flex min-h-11 cursor-pointer items-center text-sm text-muted underline underline-offset-4 transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';

/**
 * The only stateful component in the flow. Every rule it applies lives in
 * lib/passengers, so what is left here is wiring: which step is showing, what
 * has been typed, and what the last continue found wrong.
 */
export function PassengerFlow({
  countries,
  commonCount,
  today,
  quotes,
  feePercent,
  classCode,
  accommodation,
  berth
}: Props) {
  const t = useTranslations('passengers');

  const [step, setStep] = useState<'details' | 'review' | 'unbuilt'>('details');
  const [passengers, setPassengers] = useState<PassengerDraft[]>([emptyPassenger()]);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<PartyErrors | null>(null);
  const [party, setParty] = useState<Party | null>(null);

  const [restored, setRestored] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);

  // Restore before the first write, or an empty form would overwrite the draft
  // it is about to be filled from.
  useEffect(() => {
    const draft = readDraft(storage(), Date.now());
    if (draft) {
      setPassengers(draft.passengers);
      setEmail(draft.email);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) writeDraft(storage(), {passengers, email}, Date.now());
  }, [restored, passengers, email]);

  // A phone that has just replaced a long form with a short notice lands
  // wherever it was scrolled to, which is usually nowhere useful.
  useEffect(() => {
    if (step !== 'details') heading.current?.focus();
  }, [step]);

  function revalidate(draft: PartyDraft) {
    if (!errors) return;
    const result = readParty(draft, today);
    setErrors(result.status === 'ok' ? null : result);
  }

  function edit(index: number, patch: Partial<PassengerDraft>) {
    const next = passengers.map((passenger, at) =>
      at === index ? {...passenger, ...patch} : passenger
    );
    setPassengers(next);
    revalidate({passengers: next, email});
  }

  function add() {
    setPassengers([...passengers, emptyPassenger()]);
  }

  function remove(index: number) {
    const next = passengers.filter((_, at) => at !== index);
    setPassengers(next);
    revalidate({passengers: next, email});
  }

  function changeEmail(value: string) {
    setEmail(value);
    revalidate({passengers, email: value});
  }

  function startOver() {
    setPassengers([emptyPassenger()]);
    setEmail('');
    setErrors(null);
    clearDraft(storage());
  }

  function submit() {
    const result = readParty({passengers, email}, today);

    if (result.status !== 'ok') {
      setErrors(result);
      summary.current?.focus();
      return;
    }

    setErrors(null);
    setParty(result.party);
    setStep('review');
  }

  if (step === 'review' && party) {
    return (
      <Review
        party={party}
        // Priced per party size on the server. The index is the party minus one.
        quote={quotes[party.passengers.length - 1]}
        feePercent={feePercent}
        classCode={classCode}
        accommodation={accommodation}
        berth={berth}
        countries={countries}
        headingRef={heading}
        onBack={() => setStep('details')}
        onConfirm={() => setStep('unbuilt')}
      />
    );
  }

  if (step === 'unbuilt') {
    return (
      <div className={cardStyle}>
        <h2 ref={heading} tabIndex={-1} className="font-serif text-xl tracking-tight">
          {t('unbuilt.heading')}
        </h2>
        <p className="mt-2 max-w-prose text-muted">{t('unbuilt.body')}</p>
      </div>
    );
  }

  return (
    <form
      // No action and no method. A form with neither still submits on Enter,
      // and a GET submit would put every passport number in the address bar,
      // in browser history and in the access log.
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-8"
    >
      <div>
        <h2 className="font-serif text-2xl tracking-tight">{t('heading')}</h2>
        <p className="mt-2 max-w-prose text-muted">{t('intro')}</p>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('names.hint')}</p>
      </div>

      {errors ? <ErrorSummary ref={summary} errors={errors} emailId={EMAIL_ID} /> : null}

      <div className="flex flex-col gap-4">
        {passengers.map((passenger, index) => (
          <PassengerFields
            key={index}
            index={index}
            draft={passenger}
            errors={errors?.passengers[index] ?? {}}
            countries={countries}
            commonCount={commonCount}
            today={today}
            removable={passengers.length > 1}
            onChange={(patch) => edit(index, patch)}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <div>
        {passengers.length < MAX_PASSENGERS ? (
          <button type="button" onClick={add} className={secondaryButtonStyle}>
            {t('add')}
          </button>
        ) : (
          <p className="max-w-prose text-sm text-muted">{t('full')}</p>
        )}
      </div>

      <fieldset className={cardStyle}>
        <legend className="mb-4 font-serif text-xl tracking-tight">{t('contact.legend')}</legend>

        <Field
          id={EMAIL_ID}
          label={t('contact.email')}
          hint={t('contact.emailHint')}
          error={errors?.email ? t(`errors.${errors.email}`) : undefined}
        >
          {({id, describedBy, invalid}) => (
            <input
              id={id}
              name={id}
              type="email"
              value={email}
              onChange={(event) => changeEmail(event.target.value)}
              autoComplete="email"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={`${fieldStyle} ${invalid ? fieldErrorStyle : ''}`}
            />
          )}
        </Field>

        <p className="mt-4 max-w-prose text-sm text-muted">{t('contact.noPhone')}</p>
      </fieldset>

      <div className="flex flex-col gap-4">
        <button type="submit" className={primaryButtonStyle}>
          {t('continue')}
        </button>
        <div>
          <button type="button" onClick={startOver} className={quietButtonStyle}>
            {t('clear')}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Undefined rather than a throw: Safari's private mode refuses the property. */
function storage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}
