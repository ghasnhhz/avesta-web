import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {LocaleSwitcher} from './locale-switcher';

export function SiteHeader() {
  const t = useTranslations('meta');

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {t('title')}
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
