'use client';

import {type Ref} from 'react';
import {useFormatter, useTranslations} from 'next-intl';
import {PriceBreakdown} from '@/components/booking/price-breakdown';
import {cardStyle} from '@/components/passengers/passenger-fields';
import type {BerthPreference} from '@/lib/choice-params';
import type {CountryOption} from '@/lib/countries';
import {journeyDate} from '@/lib/dates';
import type {Party, Passenger} from '@/lib/passengers';
import type {PartyQuote} from '@/lib/pricing';
import type {Accommodation} from '@/lib/sources/rail';

type Props = {
  party: Party;
  quote: PartyQuote;
  feePercent: number;
  classCode: string;
  accommodation: Accommodation | null;
  /** Null on a seated class, which has no berths to prefer between. */
  berth: BerthPreference | null;
  countries: CountryOption[];
  onBack: () => void;
  onConfirm: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
};

const primaryButtonStyle =
  'min-h-11 w-full cursor-pointer rounded-md bg-accent px-5 py-3 font-medium text-on-accent transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto';

const secondaryButtonStyle =
  'min-h-11 w-full cursor-pointer rounded-md border border-border px-5 py-3 transition-colors duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto';

/**
 * Renders the validated party, never the drafts, so nothing that failed
 * validation can appear here as though it had been accepted.
 */
export function Review({
  party,
  quote,
  feePercent,
  classCode,
  accommodation,
  berth,
  countries,
  onBack,
  onConfirm,
  headingRef
}: Props) {
  const t = useTranslations('passengers.review');
  const booking = useTranslations('booking');
  const promise = useTranslations('promise');

  return (
    <div className="flex flex-col gap-8">
      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-2xl tracking-tight">
        {t('heading')}
      </h2>

      <div className={cardStyle}>
        <dl className="flex flex-col gap-4">
          <Row label={t('class')}>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{classCode}</span>
              {accommodation ? <span>{booking(`accommodation.${accommodation}`)}</span> : null}
            </span>
          </Row>

          <Row label={t('party')}>
            <ul className="flex flex-col gap-3">
              {party.passengers.map((passenger) => (
                <PassengerLine
                  key={passenger.passportNumber}
                  passenger={passenger}
                  countries={countries}
                />
              ))}
            </ul>
          </Row>

          <Row label={t('contact')}>
            {/* Printed back rather than asked for twice. A confirm field catches
                a typo repeated identically; reading the address does not. */}
            <span className="break-all">{party.email}</span>
          </Row>
        </dl>
      </div>

      {berth ? (
        <div>
          <p className="max-w-prose">
            {berth === 'any' ? t('berthAny') : t(`berthRequest.${berth}`)}
          </p>
          <p className="mt-2 max-w-prose text-sm text-muted">{booking('berth.reality')}</p>
        </div>
      ) : null}

      <div className={cardStyle}>
        <h3 className="mb-4 font-serif text-xl tracking-tight">{t('price')}</h3>
        <PriceBreakdown quote={quote} percent={feePercent} />
        <p className="mt-4 max-w-prose text-sm text-muted">{t('adultFare')}</p>
      </div>

      {/* Directly under the price, not in a footer. The uncomfortable thing is
          said first, where somebody deciding whether to trust us will read it. */}
      <div className="flex max-w-prose flex-col gap-3 text-sm text-muted">
        <p>{promise('refund')}</p>
        <p>{promise('passport')}</p>
        <p>{promise('timing')}</p>
        <p>{promise('cards')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
        <button type="button" onClick={onConfirm} className={primaryButtonStyle}>
          {t('confirm')}
        </button>
        {/* The explicit control the back button cannot offer: it returns to the
            form with every draft still in it. */}
        <button type="button" onClick={onBack} className={secondaryButtonStyle}>
          {t('change')}
        </button>
      </div>
    </div>
  );
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
      <dt className="text-sm text-muted sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function PassengerLine({
  passenger,
  countries
}: {
  passenger: Passenger;
  countries: CountryOption[];
}) {
  const t = useTranslations('passengers');
  const format = useFormatter();
  const country = countries.find((option) => option.code === passenger.country);

  return (
    <li>
      <span className="font-medium">
        {t('review.passenger', {surname: passenger.surname, firstName: passenger.firstName})}
      </span>
      <span className="mt-0.5 block text-sm text-muted">
        {t('review.passengerDetail', {
          birthDate: format.dateTime(journeyDate(passenger.birthDate), 'birthDate'),
          gender: t(`gender.${passenger.gender}`),
          passport: passenger.passportNumber,
          country: country?.name ?? passenger.country
        })}
      </span>
    </li>
  );
}
