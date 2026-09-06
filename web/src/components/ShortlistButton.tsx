'use client'

import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useOptimistic, useTransition } from 'react'
import { cn } from '@/lib/cn'
import { toggleShortlist } from '@/lib/actions'

/**
 * Optimistic, unlike the interest button: shortlisting is private and
 * reversible, so a snappy toggle beats a spinner.
 */
export function ShortlistButton({
  profileId,
  initial = false,
}: {
  profileId: string
  initial?: boolean
}) {
  const t = useTranslations('card')
  const [, start] = useTransition()
  const [on, setOn] = useOptimistic(initial)

  return (
    <button
      type="button"
      aria-label={t('shortlist')}
      aria-pressed={on}
      onClick={() =>
        start(async () => {
          setOn(!on)
          await toggleShortlist(profileId)
        })
      }
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 sm:size-11',
        on
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border-strong text-fg-muted hover:bg-surface-2 hover:text-primary',
      )}
    >
      <Heart size={17} aria-hidden fill={on ? 'currentColor' : 'none'} />
    </button>
  )
}
