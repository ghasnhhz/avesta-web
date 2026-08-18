'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {FareLines} from '@/components/results/fare-lines';
import type {BerthOption, ClassOption} from '@/lib/booking-view';

type Props = {
  options: ClassOption[];
  /** Passed in rather than imported: lib/pricing is server-only by design. */
  feePercent: number;
  /** The localised path of the passenger step, resolved on the server. */
  action: string;
  /** Carried through so the next step can refetch this exact journey. */
  journey: Record<'from' | 'to' | 'date' | 'train' | 'dep', string>;
};

const choiceStyle =
  'flex min-h-11 cursor-pointer items-start justify-between gap-4 rounded-md border border-border p-4 transition-colors duration-200 hover:border-accent has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent';

const radioStyle = 'mt-1 size-5 shrink-0 cursor-pointer accent-accent';

/**
 * Nothing here is held and nothing is created: the choice travels in the query
 * string to the next step. The one piece of state is which class is selected,
 * because the berth question exists only for berth classes — without JS the
 * form still submits a class.
 */
export function ClassChooser({options, feePercent, action, journey}: Props) {
  const t = useTranslations('booking');
  const [selected, setSelected] = useState<string | null>(null);
  const berths = options.find((choice) => choice.id === selected)?.berths ?? null;

  return (
    <form method="get" action={action} className="flex flex-col gap-8">
      {Object.entries(journey).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <fieldset>
        <legend className="font-serif text-xl tracking-tight">{t('classes.legend')}</legend>

        <div className="mt-4 flex flex-col gap-2">
          {options.map((choice) => (
            <label key={choice.id} className={choiceStyle}>
              <span className="flex min-w-0 items-start gap-3">
                <input
                  type="radio"
                  name="class"
                  value={choice.id}
                  required
                  checked={selected === choice.id}
                  onChange={() => setSelected(choice.id)}
                  className={radioStyle}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{choice.code}</span>
                    {choice.accommodation ? (
                      <span>{t(`accommodation.${choice.accommodation}`)}</span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {choice.freeSeats === null
                      ? t('classes.seatsUnknown')
                      : t('classes.seats', {count: choice.freeSeats})}
                  </span>
                </span>
              </span>
              <FareLines quote={choice.quote} percent={feePercent} />
            </label>
          ))}
        </div>
      </fieldset>

      {berths ? <BerthPreference options={berths} /> : null}

      <div>
        <button
          type="submit"
          className="min-h-11 w-full cursor-pointer rounded-md bg-accent px-5 py-3 font-medium text-on-accent transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
        >
          {t('continue')}
        </button>
        <p className="mt-4 max-w-prose text-sm text-muted">{t('nothingHeld')}</p>
      </div>
    </form>
  );
}

function BerthPreference({options}: {options: BerthOption[]}) {
  const t = useTranslations('booking.berth');

  return (
    <fieldset>
      <legend className="font-serif text-xl tracking-tight">{t('legend')}</legend>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('reality')}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {options.map((berth) => (
          <label key={berth.preference} className={`${choiceStyle} sm:flex-1`}>
            <span className="flex items-start gap-3">
              <input type="radio" name="berth" value={berth.preference} className={radioStyle} />
              <span>
                <span className="block font-medium">{t(berth.preference)}</span>
                {/* Zero is stated, not hidden: the count drifts before the ticket
                    is bought, and the answer is a preference either way. */}
                <span className="mt-1 block text-sm text-muted">
                  {t('free', {count: berth.free})}
                </span>
              </span>
            </span>
          </label>
        ))}

        <label className={`${choiceStyle} sm:flex-1`}>
          <span className="flex items-start gap-3">
            <input type="radio" name="berth" value="any" defaultChecked className={radioStyle} />
            <span className="font-medium">{t('any')}</span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
