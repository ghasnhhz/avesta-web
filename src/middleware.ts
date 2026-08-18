import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, and files with an extension.
  // /api must stay unprefixed: the source modules are called server-side and
  // the Python bot will call /api/search directly.
  matcher: '/((?!api|_next|_vercel|.*\..*).*)'
};
