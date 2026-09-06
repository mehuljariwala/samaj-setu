'use client'

import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { supabaseConfigured } from './supabase/env'

export type AppSession = {
  userId: string
  phone: string | null
  displayName: string | null
  /** 'pending' members can sign in but cannot browse — see the RLS policies. */
  status: 'pending' | 'active' | 'suspended'
  role: 'member' | 'moderator' | 'admin'
  onboarded: boolean
}

/**
 * `loading` matters: the session lives in a cookie the client reads
 * asynchronously, so both the server render and the first client render see
 * "logged out". Rendering a login prompt in that gap flashes for every
 * signed-in user.
 */
export function useSession(): { session: AppSession | null; loading: boolean } {
  const [session, setSession] = useState<AppSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    let cancelled = false

    async function load(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) setSession(null)
        return
      }
      const { data } = await supabase
        .from('app_users')
        .select('id, phone_e164, display_name, status, role')
        .eq('id', userId)
        .maybeSingle()

      if (cancelled) return
      setSession(
        data
          ? {
              userId: data.id,
              phone: data.phone_e164,
              displayName: data.display_name,
              status: data.status,
              role: data.role,
              onboarded: Boolean(data.display_name),
            }
          : null,
      )
    }

    supabase.auth.getUser().then(({ data }) => {
      load(data.user?.id).finally(() => !cancelled && setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      load(s?.user?.id)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
