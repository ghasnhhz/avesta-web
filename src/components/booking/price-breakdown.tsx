import {useTranslations} from 'next-intl';
import type {PartyQuote} from '@/lib/pricing';

type Props = {
  quote: PartyQuote;
  /** The fee percentage, which is server-only until it is rendered. */
  percent: number;
};

/**
 * A sibling of FareLines rather than a mode of it. FareLines states the fee as
 * a percentage, which is the right shape beside one fare in a list; here the
 * tourist is about to pay, so all three lines have to be real amounts they can
 * add up themselves.
 */
export function PriceBreakdown({quote, percent}: Props) {
  const t = useTranslations('price');

  return (
    <dl className="text-sm">
      <Line label={t('tickets', {count: quote.passengers})} sum={t('sum', {sum: quote.ticketSum})} />
      <Line label={t('feeLabel', {percent})} sum={t('sum', {sum: quote.feeSum})} />
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 border-t border-border pt-3 text-base font-medium">
        <dt>{t('totalLabel')}</dt>
        <dd>{t('sum', {sum: quote.totalSum})}</dd>
      </div>
    </dl>
  );
}

function Line({label, sum}: {label: string; sum: string}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd>{sum}</dd>
    </div>
  );
}
