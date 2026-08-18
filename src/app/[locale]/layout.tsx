import type {Metadata} from 'next';
import {Inter, Source_Serif_4} from 'next/font/google';
import {notFound} from 'next/navigation';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {SiteFooter} from '@/components/ui/site-footer';
import {SiteHeader} from '@/components/ui/site-header';
import {routing} from '@/i18n/routing';
import '../globals.css';

// Cyrillic is not optional: the railway returns class names (3П, 2К) and train
// types (В-СКОР) in Cyrillic even when Accept-Language is en.
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter'
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-source-serif'
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'meta'});

  return {title: t('title'), description: t('description')};
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const t = await getTranslations({locale, namespace: 'a11y'});

  return (
    <html lang={locale} className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-base leading-relaxed text-foreground antialiased">
        <NextIntlClientProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-3 focus:text-on-accent"
          >
            {t('skipToContent')}
          </a>
          <SiteHeader />
          <main id="content" className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
