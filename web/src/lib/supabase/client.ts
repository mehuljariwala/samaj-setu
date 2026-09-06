'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from './env'

/** Browser client. Writes the session to cookies so the server can read it. */
export function createClient() {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and _ANON_KEY')
  }
  return createBrowserClient(SUPABASE_URL!, SUPABASE_KEY!)
}
