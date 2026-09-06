'use client'

import { LogIn, LogOut, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { signOut } from '@/lib/auth'
import { useSession } from '@/lib/useSession'
import { initials } from '@/lib/format'

/** Signed-in state is always visible — a parent needs to know which account
 *  a biodata is about to be filed under before they spend ten minutes on it. */
export function AccountButton() {
  const { session, loading } = useSession()
  const t = useTranslations('auth')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (loading) return <span className="skeleton size-11 shrink-0 rounded-full" />

  if (!session) {
    return (
      <Link
        href={{ pathname: '/login', query: { next: pathname } }}
        className="btn btn-secondary !min-h-11 shrink-0 !px-3 !text-sm"
      >
        <LogIn size={17} aria-hidden />
        {t('login')}
      </Link>
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('loggedInAs', { name: session.name || session.phone })}
        className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
      >
        {session.name ? initials(session.name) : <UserRound size={19} aria-hidden />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-rise absolute end-0 top-13 z-50 w-56 rounded-xl border border-border bg-surface p-2 shadow-(--shadow-card-hover)">
            <p className="truncate px-2 py-1.5 text-sm text-fg-muted">
              {t('loggedInAs', { name: session.name || session.phone })}
            </p>
            <button
              type="button"
              onClick={() => {
                signOut()
                setOpen(false)
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger-soft"
            >
              <LogOut size={17} aria-hidden />
              {t('logout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
