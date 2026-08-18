import {useTranslations} from 'next-intl';
import {FEE_PERCENT} from '@/lib/pricing';
import type {ServiceRow} from '@/lib/results-view';

/**
 * Three lines, always: fare, fee, total. Folding the fee into one number is what
 * the markup resellers do. "from" is dropped when there is a single fare — it
 * would be a lie about there being something cheaper.
 */
export function FareLines({row}: {row: ServiceRow}) {
  const t = useTranslations('results.price');
  if (!row.cheapest) return null;

  return (
    <div className="text-right">
      <p className="text-lg font-medium">
        {t(row.fares.length > 1 ? 'fare' : 'fareOne', {sum: row.cheapest.ticketSum})}
      </p>
      <p className="mt-0.5 text-sm text-muted">{t('fee', {percent: FEE_PERCENT})}</p>
      <p className="text-sm text-muted">{t('total', {sum: row.cheapest.totalSum})}</p>
    </div>
  );
}
