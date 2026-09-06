'use client'

import { useEffect, useState } from 'react'
import { getSession, type Session } from './auth'

/**
 * `loading` matters: the session lives in localStorage, so the server render
 * and the first client render both see "logged out". Rendering a login prompt
 * during that gap makes the app flash for every signed-in user.
 */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setStateSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sync = () => setStateSession(getSession())
    sync()
    setLoading(false)

    window.addEventListener('samaj-session', sync)
    window.addEventListener('storage', sync) // another tab signed in or out
    return () => {
      window.removeEventListener('samaj-session', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return { session, loading }
}
