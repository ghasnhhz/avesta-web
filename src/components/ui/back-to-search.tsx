import {getTranslations} from 'next-intl/server';
import {Link} from '@/i18n/navigation';
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
