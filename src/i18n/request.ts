import {hasLocale} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Every clock time on this site is Tashkent local — the railway publishes no
    // offset and we print its times as they arrive. Pinning the zone here stops a
    // Vercel box in UTC rendering a 14:32 price check as 09:32.
    timeZone: 'Asia/Tashkent',
    formats: {
      dateTime: {
        journey: {weekday: 'short', day: 'numeric', month: 'short'},
        clock: {hour: '2-digit', minute: '2-digit'}
      }
    }
  };
});
