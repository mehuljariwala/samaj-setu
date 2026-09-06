'use client'

import { LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { supabaseConfigured } from '@/lib/supabase/env'
import { useSession } from '@/lib/useSession'

/**
 * Client-side gate. It protects the *experience*, not the data — the real
 * boundary is RLS in Postgres, which no amount of client tampering reaches.
 * Its job is to avoid dumping an unauthenticated user into a form they can't
 * submit.
 */
export function AuthGate({ next, children }: { next: string; children: ReactNode }) {
  const { session, loading } = useSession()
  const t = useTranslations('auth')

  // No Supabase means fixtures/demo mode: there is no auth to gate on, and
  // showing an unreachable login prompt would just dead-end the visitor.
  if (!supabaseConfigured) return <>{children}</>

  if (loading) {
    return (
      <div className="space-y-3 py-4" aria-busy="true">
        <div className="skeleton h-14 rounded-xl" />
        <div className="skeleton h-14 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="animate-rise flex flex-col items-center py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LogIn size={30} aria-hidden />
        </span>
        <h2 className="mt-4 text-xl font-bold">{t('needLogin')}</h2>
        <p className="mt-2 max-w-sm text-fg-muted">{t('needLoginBody')}</p>
        <Link
          href={{ pathname: '/login', query: { next } }}
          className="btn btn-primary mt-6 w-full max-w-xs"
        >
          {t('login')}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
