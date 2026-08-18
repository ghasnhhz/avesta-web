'use client';

import {useParams, useSearchParams} from 'next/navigation';
import {useTransition} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const current = params.locale as string;

  // A native select keeps the 44px touch target, the keyboard behaviour and the
  // screen-reader announcement that a custom dropdown would have to rebuild.
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t('label')}</span>
      <select
        value={current}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => {
            // usePathname drops the query. On a results page that is the whole
            // journey, so it is carried across by hand.
            const query = searchParams.toString();
            router.replace(`${pathname}${query ? `?${query}` : ''}`, {locale: next});
          });
        }}
        className="min-h-11 cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      >
        {routing.locales.map((locale) => (
          <option key={locale} value={locale}>
            {t(locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
