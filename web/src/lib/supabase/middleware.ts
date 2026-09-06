import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from './env'

/**
 * Refreshes the auth token on every request and writes the rotated cookies
 * onto the outgoing response. Without this the session silently expires and
 * Server Components start seeing a logged-out user mid-visit.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!supabaseConfigured) return response

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // getUser() revalidates against the auth server; getSession() would trust
  // whatever is in the cookie.
  await supabase.auth.getUser()
  return response
}
