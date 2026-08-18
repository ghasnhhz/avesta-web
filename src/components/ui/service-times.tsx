import {useTranslations} from 'next-intl';

type Stamp = {date: string; time: string};

type Props = {
  departure: Stamp;
  /** Null when upstream publishes no arrival — a bus with equal timestamps. */
  arrival: Stamp | null;
  /** Whole days between two published dates. Never a computed duration. */
  dayOffset: number | null;
  muted?: boolean;
};

/** The departure → arrival pair, rendered identically wherever a service is shown. */
export function ServiceTimes({departure, arrival, dayOffset, muted = false}: Props) {
  const t = useTranslations('times');

  return (
    <p className={`flex items-baseline gap-2 text-xl ${muted ? 'text-muted' : ''}`}>
      <span className="sr-only">{t('departs')} </span>
      <time dateTime={`${departure.date}T${departure.time}`}>{departure.time}</time>
      <span aria-hidden="true" className="text-muted">
        →
      </span>
      <span className="sr-only">{t('arrives')} </span>
      {arrival ? (
        <time dateTime={`${arrival.date}T${arrival.time}`}>{arrival.time}</time>
      ) : (
        <span aria-hidden="true">—</span>
      )}
      {dayOffset !== null && dayOffset > 0 ? (
        <>
          <span aria-hidden="true" className="text-sm text-muted">
            {t('nextDayMark', {days: dayOffset})}
          </span>
          <span className="sr-only">{t('nextDay', {days: dayOffset})}</span>
        </>
      ) : null}
    </p>
  );
}
