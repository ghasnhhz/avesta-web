import {useFormatter, useTranslations} from 'next-intl';
import {ServiceTimes} from '@/components/ui/service-times';
import {Link} from '@/i18n/navigation';
import {journeyDate} from '@/lib/dates';
import type {SearchQuery} from '@/lib/search-params';
import type {Train} from '@/lib/sources/rail';

type Props = {
  train: Train;
  arrivalDayOffset: number;
  query: SearchQuery;
};

/** The service the tourist picked, restated so the choice below has a subject. */
export function JourneySummary({train, arrivalDayOffset, query}: Props) {
  const t = useTranslations('booking');
  const times = useTranslations('times');
  const format = useFormatter();

  return (
    <header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
          {t('journey', {from: query.from, to: query.to})}
        </h1>
        <Link
          href={{pathname: '/search', query}}
          className="text-sm text-accent underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {t('back')}
        </Link>
      </div>

      <p className="mt-2 text-muted">
        {format.dateTime(journeyDate(query.date), 'journey')} ·{' '}
        {[train.number, train.brand].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-4">
        <ServiceTimes
          departure={train.departure}
          arrival={train.arrival}
          dayOffset={arrivalDayOffset}
        />
        {train.timeOnWay ? (
          // Upstream's own figure, printed as it arrives. We never compute one.
          <p className="mt-1 text-sm text-muted">{times('onTheWay', {time: train.timeOnWay})}</p>
        ) : null}
      </div>
    </header>
  );
}
