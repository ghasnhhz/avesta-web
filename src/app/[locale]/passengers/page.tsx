import {getTranslations, setRequestLocale} from 'next-intl/server';
import {Notice} from '@/components/ui/notice';
import {Link} from '@/i18n/navigation';
import type {Locale} from '@/i18n/routing';

type Props = {params: Promise<{locale: Locale}>};

/**
 * The end of feature 4. The chosen class and berth arrive in the query string
 * and are deliberately not read here — feature 5 builds the passenger form and
 * re-checks the choice against live prices before anything is created.
 */
export default async function PassengersPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const t = await getTranslations('passengers');

  return (
    <Notice heading={t('heading')}>
      <p>{t('body')}</p>
      <p className="mt-4">
        <Link
          href="/"
          className="text-accent underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {t('back')}
        </Link>
      </p>
    </Notice>
  );
}
