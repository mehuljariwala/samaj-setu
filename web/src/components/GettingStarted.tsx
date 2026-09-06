'use client'

import { ArrowRight, Check, ClipboardPaste, Search, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/useSession'

/**
 * The end-to-end path, stated plainly. Without this the app is a set of
 * screens; with it, a first-time visitor can see the whole journey and where
 * they currently are in it.
 */
export function GettingStarted() {
  const t = useTranslations('home')
  const { session, loading } = useSession()

  if (loading) return <div className="skeleton h-56 rounded-[var(--radius-card)]" />

  const steps = [
    { key: 'j1', href: '/login', Icon: UserPlus, done: Boolean(session) },
    { key: 'j2', href: '/add', Icon: ClipboardPaste, done: false },
    { key: 'j3', href: '/browse', Icon: Search, done: false },
  ] as const

  const activeIndex = steps.findIndex((s) => !s.done)

  return (
    <section aria-labelledby="journey" className="card p-5">
      <h3 id="journey" className="text-lg font-bold">
        {t('journeyTitle')}
      </h3>

      <ol className="stagger mt-4 space-y-2">
        {steps.map((s, i) => {
          const active = i === activeIndex
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 transition-colors duration-150',
                  active
                    ? 'border-primary bg-primary-soft'
                    : s.done
                      ? 'border-transparent bg-success-soft'
                      : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    s.done
                      ? 'bg-success text-white'
                      : active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-2 text-fg-subtle',
                  )}
                >
                  {s.done ? <Check size={19} strokeWidth={3} /> : <s.Icon size={19} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn('font-bold', s.done && 'text-success')}>
                      {t(s.key as 'j1')}
                    </span>
                    {s.done && <span className="chip chip-success !text-xs">{t('journeyDone')}</span>}
                    {active && <span className="chip chip-primary !text-xs">{t('journeyNow')}</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-fg-muted">
                    {t(`${s.key}Body` as 'j1Body')}
                  </span>
                </span>

                {!s.done && <ArrowRight size={18} aria-hidden className="shrink-0 text-fg-subtle" />}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
