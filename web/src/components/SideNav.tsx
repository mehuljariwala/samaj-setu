'use client'

import { Home, Search, Heart, User, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

const ITEMS = [
  { href: '/', icon: Home, key: 'home' },
  { href: '/browse', icon: Search, key: 'browse' },
  { href: '/interests', icon: Heart, key: 'interests' },
  { href: '/me', icon: User, key: 'mine' },
] as const

/**
 * Desktop navigation. Material's adaptive guidance puts a sidebar on screens
 * ≥1024px and a bottom bar below that — the same four destinations, placed
 * where the pointer or the thumb actually is.
 */
export function SideNav() {
  const t = useTranslations('nav')
  const tApp = useTranslations('app')
  const tForm = useTranslations('form')
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
      <Link href="/" className="mb-6 block px-3">
        <span className="block text-xl font-bold text-primary">{tApp('name')}</span>
        <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">
          {tApp('tagline')}
        </span>
      </Link>

      <nav aria-label={t('home')} className="flex-1">
        <ul className="space-y-1">
          {ITEMS.map(({ href, icon: Icon, key }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-lg px-3 font-medium transition-colors duration-150',
                    active
                      ? 'bg-primary-soft text-primary'
                      : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden className="shrink-0" />
                  {t(key)}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* The primary action stays reachable from every screen on desktop,
          where there's room for it without crowding the four destinations. */}
      <Link href="/add" className="btn btn-primary mt-4 w-full !text-sm">
        <Plus size={19} aria-hidden />
        {tForm('titleNew')}
      </Link>
    </aside>
  )
}
