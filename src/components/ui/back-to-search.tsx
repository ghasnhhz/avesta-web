import {getTranslations} from 'next-intl/server';
import {Link} from '@/i18n/navigation';
import type {SearchParamsResult} from '@/lib/search-params';
import {Notice} from './notice';

/**
 * For anything a tourist can fix by editing the search: a city we do not serve,
 * a date that has passed, a journey we do not sell. Shared so every screen that
 * reads a URL says it the same way.
 */
export async function BackToSearch({heading, body}: {heading: string; body: string}) {
  const t = await getTranslations('results.invalid');

  return (
    <Notice heading={heading}>
      <p>{body}</p>
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

type Invalid = Exclude<SearchParamsResult, {status: 'ok'}>;

/**
 * One sentence per way a search URL can be wrong, said the same way everywhere.
 * Pages send an empty search back to the form rather than rendering `missing`,
 * but the sentence exists so that forgetting to cannot leave a tourist reading
 * an error about a date they never gave.
 */
export async function InvalidSearch({result}: {result: Invalid}) {
  const t = await getTranslations('results.invalid');

  const body =
    result.status === 'missing'
      ? t('missing')
      : result.status === 'unknown_city'
        ? t('unknownCity', {city: result.city})
        : result.status === 'same_city'
          ? t('sameCity')
          : result.status === 'bad_date'
            ? t('badDate')
            : t('pastDate');

  return <BackToSearch heading={t('heading')} body={body} />;
}
