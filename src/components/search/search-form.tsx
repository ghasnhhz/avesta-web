import {useTranslations} from 'next-intl';
import {fieldStyle} from '@/components/ui/field';
import {getPathname} from '@/i18n/navigation';
import type {Locale} from '@/i18n/routing';
import {todayInTashkent} from '@/lib/dates';
import {RAIL_CITIES} from '@/lib/sources/rail';

type Props = {
  locale: Locale;
  defaults?: {from?: string; to?: string; date?: string};
};

/**
 * A plain GET form: no client JS, and the query the results page reads is the
 * query the tourist can see, share and edit in the address bar. Native selects
 * over a flat list — they are type-ahead searchable, keep the 44px touch target
 * and the screen-reader announcement, and need no region step.
 */
export function SearchForm({locale, defaults}: Props) {
  const t = useTranslations('search');

  return (
    <form
      method="get"
      action={getPathname({href: '/search', locale})}
      className="rounded-lg border border-border bg-surface p-5 sm:p-6"
    >
      <h2 className="font-serif text-xl tracking-tight">{t('heading')}</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(['from', 'to'] as const).map((name) => (
          <label key={name} className="block">
            <span className="mb-1.5 block text-sm text-muted">{t(name)}</span>
            <select
              name={name}
              required
              defaultValue={defaults?.[name] ?? ''}
              className={`${fieldStyle} cursor-pointer`}
            >
              <option value="" disabled>
                {t('chooseCity')}
              </option>
              {RAIL_CITIES.map((city) => (
                <option key={city} value={city}>
                  {t(`cities.${city}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm text-muted">{t('date')}</span>
        <input
          type="date"
          name="date"
          required
          // Tashkent's today, not the server's — see todayInTashkent.
          min={todayInTashkent()}
          defaultValue={defaults?.date}
          className={fieldStyle}
        />
      </label>

      <button
        type="submit"
        className="mt-6 min-h-11 w-full cursor-pointer rounded-md bg-accent px-5 py-3 font-medium text-on-accent transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t('submit')}
      </button>
    </form>
  );
}
