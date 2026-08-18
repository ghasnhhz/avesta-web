import {useTranslations} from 'next-intl';
import {FEE_PERCENT} from '@/lib/pricing';
import type {ServiceRow} from '@/lib/results-view';
import {FareLines} from './fare-lines';

function Times({row, muted}: {row: ServiceRow; muted: boolean}) {
  const t = useTranslations('results.row');
  const {service, arrivalDayOffset} = row;

  return (
    <p className={`flex items-baseline gap-2 text-xl ${muted ? 'text-muted' : ''}`}>
      <span className="sr-only">{t('departs')} </span>
      <time dateTime={`${service.departure.date}T${service.departure.time}`}>
        {service.departure.time}
      </time>
      <span aria-hidden="true" className="text-muted">
        →
      </span>
      <span className="sr-only">{t('arrives')} </span>
      {service.arrival ? (
        <time dateTime={`${service.arrival.date}T${service.arrival.time}`}>
          {service.arrival.time}
        </time>
      ) : (
        <span aria-hidden="true">—</span>
      )}
      {arrivalDayOffset !== null && arrivalDayOffset > 0 ? (
        <>
          <span aria-hidden="true" className="text-sm text-muted">
            {t('nextDayMark', {days: arrivalDayOffset})}
          </span>
          <span className="sr-only">{t('nextDay', {days: arrivalDayOffset})}</span>
        </>
      ) : null}
    </p>
  );
}

function Identity({row}: {row: ServiceRow}) {
  const t = useTranslations('results.row');
  const {service} = row;
  if (service.mode !== 'train') return null;

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {[service.number, service.brand].filter(Boolean).join(' · ')}
      </p>
      {service.timeOnWay ? (
        // Upstream's own figure, printed as it arrives. We never compute one.
        <p className="mt-1 text-sm text-muted">{t('onTheWay', {time: service.timeOnWay})}</p>
      ) : null}
    </>
  );
}

function Fares({row}: {row: ServiceRow}) {
  const t = useTranslations('results.row');
  const price = useTranslations('price');

  return (
    <ul className="mt-4 flex flex-col gap-1 text-sm">
      {row.fares.map((fare, index) => (
        <li key={`${row.key}:${index}`} className="flex flex-wrap items-baseline gap-x-3">
          {fare.code ? <span className="font-medium">{fare.code}</span> : null}
          <span>{price('fareOne', {sum: fare.quote.ticketSum})}</span>
          <span className="text-muted">
            {fare.freeSeats === null ? t('seatsUnknown') : t('seats', {count: fare.freeSeats})}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ServiceRowItem({row}: {row: ServiceRow}) {
  const t = useTranslations('results.row');
  const soldOut = row.kind === 'sold_out';

  return (
    <li className="border-b border-border py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <Times row={row} muted={soldOut} />
          <Identity row={row} />
        </div>

        {row.cheapest ? (
          <FareLines
            quote={row.cheapest}
            percent={FEE_PERCENT}
            from={row.fares.length > 1}
          />
        ) : soldOut ? (
          // Listed, timed, unpriced and unbookable — never hidden, and never
          // given a price from anywhere else.
          <p className="text-sm text-muted">{t('soldOut')}</p>
        ) : null}
      </div>

      {row.kind === 'bookable' ? <Fares row={row} /> : null}

      {row.kind === 'price_unreliable' ? (
        // Deliberately not greyed. A fare we refused to trust is a different
        // thing from a sold-out train, and the two must not read the same.
        <div className="mt-4 rounded-md border border-border bg-surface p-4">
          <p className="font-medium">{t('unpriced.heading')}</p>
          <p className="mt-1 max-w-prose text-sm text-muted">{t('unpriced.body')}</p>
        </div>
      ) : null}
    </li>
  );
}
