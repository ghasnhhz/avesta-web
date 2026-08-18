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
    <main>
      <h1>{t('heading')}</h1>
      <p>{t('intro')}</p>
    </main>
  );
}
