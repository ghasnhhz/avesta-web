import {getTranslations, setRequestLocale} from 'next-intl/server';
import {ResultsHeader} from '@/components/results/results-header';
import {ServiceRowItem} from '@/components/results/service-row';
import {Notice} from '@/components/ui/notice';
import {Link, redirect} from '@/i18n/navigation';
import type {Locale} from '@/i18n/routing';
import {todayInTashkent} from '@/lib/dates';
import {buildResults} from '@/lib/results-view';
import {readSearchParams} from '@/lib/search-params';
import {searchServices} from '@/lib/sources';

type Props = {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function BackToSearch({heading, body}: {heading: string; body: string}) {
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

export default async function ResultsPage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);

  const parsed = readSearchParams(await searchParams, todayInTashkent());
  const t = await getTranslations('results');

  // Nothing asked at all is not an error worth a screen — send them to the form.
  // Anything asked and wrong gets told what was wrong, on the page they landed on.
  if (parsed.status === 'missing') redirect({href: '/', locale});

  if (parsed.status !== 'ok') {
    const body =
      parsed.status === 'unknown_city'
        ? t('invalid.unknownCity', {city: parsed.city})
        : parsed.status === 'same_city'
          ? t('invalid.sameCity')
          : parsed.status === 'bad_date'
            ? t('invalid.badDate')
            : t('invalid.pastDate');

    return <BackToSearch heading={t('invalid.heading')} body={body} />;
  }

  const {from, to, date} = parsed.query;
  const search = await searchServices(from, to, date);
  const view = buildResults(search);

  if (view.state === 'unavailable') {
    return (
      <Notice tone="warning" heading={t('failed.heading')}>
        <p>{t('failed.body')}</p>
      </Notice>
    );
  }

  if (view.state === 'unserved') {
    return <BackToSearch heading={t('unserved.heading')} body={t('unserved.body')} />;
  }

  if (view.state === 'none') {
    return (
      <div className="flex flex-col gap-8">
        <ResultsHeader
          query={parsed.query}
          count={0}
          soldOutCount={0}
          fetchedAt={search.fetchedAt}
          stale={search.stale}
        />
        <Notice heading={t('empty.heading')}>
          <p>{t('empty.body', {from, to})}</p>
        </Notice>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ResultsHeader
        query={parsed.query}
        count={view.rows.length}
        soldOutCount={view.soldOutCount}
        fetchedAt={search.fetchedAt}
        stale={search.stale}
      />
      {/* One list in departure order, sold-out services in their place. */}
      <ol>
        {view.rows.map((row) => (
          <ServiceRowItem key={row.key} row={row} />
        ))}
      </ol>
    </div>
  );
}
