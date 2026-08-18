import {useTranslations} from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 text-sm text-muted">
        <p>{t('fee')}</p>
        <p className="mt-2">{t('cards')}</p>
      </div>
    </footer>
  );
}
