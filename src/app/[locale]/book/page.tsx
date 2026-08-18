import {getTranslations, setRequestLocale} from 'next-intl/server';
import {ClassChooser} from '@/components/booking/class-chooser';
import {JourneySummary} from '@/components/booking/journey-summary';
import {BackToSearch, InvalidSearch} from '@/components/ui/back-to-search';
import {Notice} from '@/components/ui/notice';
import {Link, getPathname, redirect} from '@/i18n/navigation';
import type {Locale} from '@/i18n/routing';
import {readBookingParams} from '@/lib/booking-params';
import {buildBooking} from '@/lib/booking-view';
import {todayInTashkent} from '@/lib/dates';
import {FEE_PERCENT} from '@/lib/pricing';
import type {SearchQuery} from '@/lib/search-params';
import {searchServices} from '@/lib/sources';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function BackToResults({
  heading,
  body,
  query
}: {
  heading: string;
  body: string;
  query: SearchQuery;
}) {
  const t = await getTranslations('booking');

  return (
    <Notice heading={heading}>
      <p>{body}</p>
      <p className="mt-4">
        <Link
          href={{pathname: '/search', query}}
          className="text-accent underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {t('back')}
        </Link>
      </p>
    </Notice>
  );
}

export default async function BookingPage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const parsed = readBookingParams(await searchParams, todayInTashkent());
  const t = await getTranslations('booking');
  const results = await getTranslations('results');

  if (parsed.status === 'missing') redirect({href: '/', locale});
  if (parsed.status !== 'ok') return <InvalidSearch result={parsed} />;

  const {query, ref} = parsed;
  // Same route, date and cache key as the results page, so opening a train
  // costs no extra call upstream.
  const view = buildBooking(await searchServices(query.from, query.to, query.date), ref);

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
      <BackToResults heading={t('notFound.heading')} body={t('notFound.body')} query={query} />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <JourneySummary
        train={view.train}
        arrivalDayOffset={view.arrivalDayOffset}
        query={query}
      />

      {view.state === 'ready' ? (
        <ClassChooser
          options={view.classes}
          feePercent={FEE_PERCENT}
          action={getPathname({href: '/passengers', locale})}
          journey={{...query, train: ref.train, dep: ref.departure}}
        />
      ) : (
        // Sold out since the results page rendered, or a fare we refused to
        // trust. Neither is an error, and neither reads as the other.
        <BackToResults
          heading={view.state === 'sold_out' ? t('soldOut.heading') : t('unpriced.heading')}
          body={view.state === 'sold_out' ? t('soldOut.body') : t('unpriced.body')}
          query={query}
        />
      )}
    </div>
  );
}
