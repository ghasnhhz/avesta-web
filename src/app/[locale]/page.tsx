import {getTranslations, setRequestLocale} from 'next-intl/server';
import {SearchForm} from '@/components/search/search-form';
import type {Locale} from '@/i18n/routing';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

export default async function HomePage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  // Prefilled by the "change" link on the results page, so a tourist adjusting a
  // date comes back to the journey they already chose rather than an empty form.
  const query = await searchParams;
  const t = await getTranslations('home');
  const promise = await getTranslations('promise');

  return (
    <div>
      <div className="max-w-prose">
        <h1 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
          {t('heading')}
        </h1>
        <p className="mt-6 text-lg text-muted">{t('intro')}</p>
      </div>

      <div className="mt-10">
        <SearchForm
          locale={locale}
          defaults={{from: one(query.from), to: one(query.to), date: one(query.date)}}
        />
      </div>

      <p className="mt-10 max-w-prose text-muted">{promise('refund')}</p>
    </div>
  );
}
