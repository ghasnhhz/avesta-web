import {defineRouting} from 'next-intl/routing';

// EN is the tourist default. UZ and RU exist for local staff and regional
// visitors, and their message files start as copies of EN rather than as
// empty stubs, so a missing translation never renders a key.
export const routing = defineRouting({
  locales: ['en', 'uz', 'ru'],
  defaultLocale: 'en'
});

export type Locale = (typeof routing.locales)[number];
