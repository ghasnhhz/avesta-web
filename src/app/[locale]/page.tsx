import {useTranslations} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {use} from 'react';

export default function HomePage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = use(params);
  setRequestLocale(locale);

  const t = useTranslations('home');

  return (
    <div className="max-w-prose">
      <h1 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
        {t('heading')}
      </h1>
      <p className="mt-6 text-lg text-muted">{t('intro')}</p>
      <p className="mt-4 text-muted">{t('refund')}</p>
    </div>
  );
}
