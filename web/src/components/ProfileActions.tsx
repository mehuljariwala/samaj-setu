'use client'

import { Check, Flag, Heart, Loader2, Lock, Share2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { cn } from '@/lib/cn'
import { reportProfile, requestPhotoAccess, sendInterest } from '@/lib/actions'

type State = 'idle' | 'done' | 'error'

/**
 * The profile page's action bar. Optimistic-free on purpose: sending an
 * interest is a socially consequential act, so the button waits for the
 * server rather than claiming success it hasn't got.
 */
export function ProfileActions({
  profileId,
  showPhotoRequest,
  variant = 'bar',
}: {
  profileId: string
  showPhotoRequest?: boolean
  variant?: 'bar' | 'rail'
}) {
  const t = useTranslations('profile')
  const [pending, start] = useTransition()
  const [interest, setInterest] = useState<State>('idle')
  const [photo, setPhoto] = useState<State>('idle')
  const [message, setMessage] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, set: (s: State) => void) {
    start(async () => {
      const res = await fn()
      if (res.ok) {
        set('done')
        setMessage(null)
        return
      }
      set('error')
      setMessage(res.error === 'need_own_profile' ? t('needOwnProfile') : t('actionFailed'))
    })
  }

  return (
    <div className={variant === 'rail' ? 'mt-3 hidden lg:block' : ''}>
      {showPhotoRequest && (
        <button
          type="button"
          disabled={pending || photo === 'done'}
          onClick={() => run(() => requestPhotoAccess(profileId), setPhoto)}
          className="btn btn-secondary mb-3 w-full"
        >
          {photo === 'done' ? <Check size={18} aria-hidden /> : <Lock size={18} aria-hidden />}
          {photo === 'done' ? t('photoRequested') : t('requestPhoto')}
        </button>
      )}

      <div className="flex gap-3">
        <button type="button" className="btn btn-secondary !px-4" aria-label={t('shareCard')}>
          <Share2 size={20} aria-hidden />
        </button>

        <button
          type="button"
          disabled={pending || interest === 'done'}
          onClick={() => run(() => sendInterest(profileId), setInterest)}
          className={cn('btn flex-1', interest === 'done' ? 'btn-secondary' : 'btn-primary')}
        >
          {pending && <Loader2 size={20} aria-hidden className="animate-spin" />}
          {!pending && (interest === 'done'
            ? <Check size={20} aria-hidden />
            : <Heart size={20} aria-hidden />)}
          {interest === 'done' ? t('interestSentToast') : t('sendInterest')}
        </button>
      </div>

      {message && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-danger">
          {message}
        </p>
      )}
    </div>
  )
}

export function ReportButton({ profileId }: { profileId: string }) {
  const t = useTranslations('profile')
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() => {
        const reason = window.prompt(t('reportReason'))
        if (!reason?.trim()) return
        start(async () => {
          const res = await reportProfile(profileId, reason.trim())
          if (res.ok) setDone(true)
        })
      }}
      className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 text-sm font-medium text-fg-subtle"
    >
      <Flag size={16} aria-hidden />
      {done ? t('reported') : t('report')}
    </button>
  )
}
