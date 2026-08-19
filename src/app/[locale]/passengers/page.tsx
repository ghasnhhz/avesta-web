import {getTranslations, setRequestLocale} from 'next-intl/server';
import {JourneySummary} from '@/components/booking/journey-summary';
import {PassengerFlow} from '@/components/passengers/passenger-flow';
import {BackToSearch, InvalidSearch} from '@/components/ui/back-to-search';
import {Notice} from '@/components/ui/notice';
import {Link, redirect} from '@/i18n/navigation';
import type {Locale} from '@/i18n/routing';
import type {ServiceRef} from '@/lib/booking-params';
import {buildBooking} from '@/lib/booking-view';
import {type Choice, readChoiceParams} from '@/lib/choice-params';
import {COMMON_PASSPORT_COUNTRY_CODES, countryOptions} from '@/lib/countries';
import {todayInTashkent} from '@/lib/dates';
import {type PassengerView, buildPassengerChoice} from '@/lib/passenger-view';
import {PARTY_SIZES} from '@/lib/passengers';
import {FEE_PERCENT, partyQuote} from '@/lib/pricing';
import type {SearchQuery} from '@/lib/search-params';
import {searchServices} from '@/lib/sources';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const linkStyle =
  'text-accent underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';

type Journey = {query: SearchQuery; ref: ServiceRef};

function bookingQuery({query, ref}: Journey) {
  return {...query, train: ref.train, dep: ref.departure};
}

/** Back to the class list for this train, which is where a broken choice belongs. */
async function BackToClasses({
  heading,
  body,
  journey
}: {
  heading: string;
  body: string;
  journey: Journey;
}) {
  const t = await getTranslations('passengers');

  return (
    <Notice heading={heading}>
      <p>{body}</p>
      <p className="mt-4">
        <Link href={{pathname: '/book', query: bookingQuery(journey)}} className={linkStyle}>
          {t('back')}
        </Link>
      </p>
    </Notice>
  );
}

export default async function PassengersPage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const today = todayInTashkent();
  const parsed = readChoiceParams(await searchParams, today);
  const t = await getTranslations('passengers');
  const results = await getTranslations('results');
  const booking = await getTranslations('booking');

  if (parsed.status === 'missing') redirect({href: '/', locale});
  if (parsed.status !== 'ok' && parsed.status !== 'no_class') {
    return <InvalidSearch result={parsed} />;
  }

  const journey: Journey = {query: parsed.query, ref: parsed.ref};

  if (parsed.status === 'no_class') {
    return (
      <BackToClasses heading={t('noClass.heading')} body={t('noClass.body')} journey={journey} />
    );
  }

  // Same route, date and cache key as the results and booking pages, so
  // re-checking the fare here costs no extra call upstream.
  const search = await searchServices(parsed.query.from, parsed.query.to, parsed.query.date);
  const view = buildPassengerChoice(buildBooking(search, parsed.ref), parsed.choice);

  if (view.state === 'unavailable') {
    return (
      <Notice tone="warning" heading={results('failed.heading')}>
        <p>{results('failed.body')}</p>
      </Notice>
    );
  }

  if (view.state === 'unserved') {
    return <BackToSearch heading={results('unserved.heading')} body={results('unserved.body')} />;
  }

  if (view.state === 'not_found') {
    return (
      <BackToClasses
        heading={booking('notFound.heading')}
        body={booking('notFound.body')}
        journey={journey}
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <JourneySummary
        train={view.train}
        arrivalDayOffset={view.arrivalDayOffset}
        query={parsed.query}
      />

      {view.state === 'ready' ? (
        <PassengerFlow
          // English, not `locale`, until uz.json and ru.json are really
          // translated. They are byte-identical English today, so Russian
          // country names beside English labels read as a broken page rather
          // than as a multilingual one.
          countries={countryOptions('en')}
          commonCount={COMMON_PASSPORT_COUNTRY_CODES.length}
          today={today}
          // Every party size priced on the server: lib/pricing is server-only,
          // and the client must never multiply money.
          quotes={PARTY_SIZES.map((size) => partyQuote(view.option.quote, size))}
          feePercent={FEE_PERCENT}
          classCode={view.option.code}
          accommodation={view.option.accommodation}
          berth={view.berth}
        />
      ) : view.state === 'price_changed' ? (
        <PriceChanged view={view} journey={journey} choice={parsed.choice} />
      ) : view.state === 'class_gone' ? (
        <BackToClasses
          heading={t('classGone.heading')}
          body={t('classGone.body', {code: view.code})}
          journey={journey}
        />
      ) : (
        // Sold out since the class was chosen, or a fare we refused to trust.
        <BackToClasses
          heading={
            view.state === 'sold_out' ? booking('soldOut.heading') : booking('unpriced.heading')
          }
          body={view.state === 'sold_out' ? booking('soldOut.body') : booking('unpriced.body')}
          journey={journey}
        />
      )}
    </div>
  );
}

/**
 * Names the number the railway is asking now, never a recalculation of the one
 * the link was built with, and carries the new class id onward so the next
 * screen prices exactly what was just quoted.
 */
async function PriceChanged({
  view,
  journey,
  choice
}: {
  view: Extract<PassengerView, {state: 'price_changed'}>;
  journey: Journey;
  choice: Choice;
}) {
  const t = await getTranslations('passengers');

  return (
    <Notice tone="warning" heading={t('priceChanged.heading')}>
      <p>
        {t('priceChanged.body', {
          code: view.option.code,
          was: view.chosenSum,
          now: view.option.quote.ticketSum
        })}
      </p>
      <p className="mt-4">
        <Link
          href={{
            pathname: '/passengers',
            query: {...bookingQuery(journey), class: view.option.id, berth: choice.berth}
          }}
          className={linkStyle}
        >
          {t('priceChanged.continue', {now: view.option.quote.ticketSum})}
        </Link>
      </p>
    </Notice>
  );
}
