import {useTranslations} from 'next-intl';
import type {Quote} from '@/lib/pricing';

type Props = {
  quote: Quote;
  /** The fee percentage, which is server-only until it is rendered. */
  percent: number;
  /** True only when a cheaper option is being summarised, never on one price. */
  from?: boolean;
};

/**
 * Three lines, always: fare, fee, total. Folding the fee into one number is what
 * the markup resellers do. "from" is dropped when there is a single fare — it
 * would be a lie about there being something cheaper.
 */
export function FareLines({quote, percent, from = false}: Props) {
  const t = useTranslations('price');

  return (
    <div className="text-right">
      <p className="text-lg font-medium">
        {t(from ? 'fare' : 'sum', {sum: quote.ticketSum})}
      </p>
      <p className="mt-0.5 text-sm text-muted">{t('fee', {percent})}</p>
      <p className="text-sm text-muted">{t('total', {sum: quote.totalSum})}</p>
    </div>
  );
}
