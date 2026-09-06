import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { refreshSession } from './lib/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

/**
 * next-intl decides the locale and produces the response; Supabase then writes
 * any rotated auth cookies onto that same response. Order matters — the intl
 * middleware may return a redirect, and the refreshed cookies have to ride
 * along with it or the session is lost on the hop.
 */
export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)
  return refreshSession(request, response)
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
