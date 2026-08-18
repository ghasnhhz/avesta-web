import {useFormatter, useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {journeyDate} from '@/lib/dates';
import type {SearchQuery} from '@/lib/search-params';

type Props = {
  query: SearchQuery;
  count: number;
  soldOutCount: number;
  fetchedAt: number;
  stale: boolean;
};

export function ResultsHeader({query, count, soldOutCount, fetchedAt, stale}: Props) {
  const t = useTranslations('results');
  const format = useFormatter();

  // Absolute, not "2 minutes ago": a relative label rendered on the server is
  // true for one moment and stays on screen long after it stops being true.
  // The zone is named because every other time on this page is Tashkent's.
  const checkedAt = format.dateTime(new Date(fetchedAt), 'clock');

  return (
    <header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
          {t('journey', {from: query.from, to: query.to})}
        </h1>
        <Link
          href={{pathname: '/', query}}
          className="text-sm text-accent underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {t('change')}
        </Link>
      </div>

      <p className="mt-2 text-muted">
        {format.dateTime(journeyDate(query.date), 'journey')} · {t('count', {count})}
        {soldOutCount > 0 ? ` · ${t('soldOutCount', {count: soldOutCount})}` : ''}
      </p>

      {/* One slot: the stale warning replaces the freshness line rather than
          appearing beside it, so the list below never shifts. */}
      <p className="mt-1 text-sm text-muted">
        <time dateTime={new Date(fetchedAt).toISOString()}>
          {stale ? t('stale', {time: checkedAt}) : t('freshness', {time: checkedAt})}
        </time>
      </p>
    </header>
  );
}
