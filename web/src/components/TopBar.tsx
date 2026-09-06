'use client'

import { ChevronRight } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/cn'

/**
 * Language is a two-state toggle, always visible, never behind a settings
 * menu. Someone who lands on the wrong language cannot navigate to a settings
 * screen to fix it — the labels are in a script they can't read.
 */
function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [pending, startTransition] = useTransition()

  function switchTo(next: string) {
    if (next === locale) return
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname is a validated route at runtime
        { pathname, params },
        { locale: next },
      )
    })
  }

  return (
    <div
      role="group"
      aria-label="Language / ભાષા"
      className={cn(
        'flex items-center rounded-full border border-border bg-surface-2 p-0.5',
        pending && 'opacity-60',
      )}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          className={cn(
            'min-h-11 rounded-full px-3 text-sm font-semibold transition-colors duration-150',
            l === locale ? 'bg-primary text-on-primary' : 'text-fg-muted',
          )}
        >
          {l === 'gu' ? 'ગુજરાતી' : 'EN'}
        </button>
      ))}
    </div>
  )
}

export function TopBar({
  title,
  subtitle,
  back,
}: {
  title: string
  subtitle?: string
  back?: { href: string; label: string }
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-2"
          >
            <ChevronRight size={24} aria-hidden className="rotate-180" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{title}</h1>
          {subtitle && <p className="truncate text-sm text-fg-muted">{subtitle}</p>}
        </div>
        <LanguageToggle />
      </div>
    </header>
  )
}
