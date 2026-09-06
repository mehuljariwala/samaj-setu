import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from './env'

/**
 * Server client bound to the request's cookies, so every query runs as the
 * signed-in user and RLS applies.
 *
 * This matters more than it looks: the previous data layer built an anonymous
 * client with no session, which under RLS can read nothing at all.
 */
export async function createClient() {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured')
  }
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL!, SUPABASE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session, so this is safe to swallow.
        }
      },
    },
  })
}

/**
 * Service-role client. Bypasses RLS entirely — server-only, never exposed to
 * the browser, and every use should be auditable.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !key) throw new Error('Service role key not configured')

  return createServerClient(SUPABASE_URL, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}
