'use client'

import { Home, Search, Heart, User } from 'lucide-react'
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
 * Four items, never more (Material caps bottom nav at five). Every item keeps
 * its text label: icon-only navigation is unreadable to a first-time user in
 * their sixties, and these glyphs carry no cultural convention in Gujarat.
 */
export function BottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  // Detail screens own the bottom of the viewport for their primary action.
  // Stacking a CTA bar above the nav would eat ~130px of a small phone.
  if (pathname.startsWith('/profile/') || pathname.startsWith('/import')) return null

  return (
    <nav
      aria-label={t('home')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur safe-bottom"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ href, icon: Icon, key }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // 64px tall — thumb-sized, and clear of the Android gesture bar.
                  'flex h-16 flex-col items-center justify-center gap-1 transition-colors duration-150',
                  active ? 'text-primary' : 'text-fg-muted',
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                  className="shrink-0"
                />
                <span className={cn('text-xs leading-none', active && 'font-semibold')}>
                  {t(key)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
