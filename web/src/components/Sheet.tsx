'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Bottom sheet. Preferred over a full-page filter screen because it keeps the
 * results visible behind the scrim — the user can see their filtering take
 * effect without losing their place.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const t = useTranslations('common')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // Lock the page behind the sheet, otherwise scrolling past the sheet's
    // end scrolls the list underneath it.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* 50% scrim: strong enough to isolate the sheet, light enough that the
          list behind stays legible as context. */}
      <button
        type="button"
        aria-label={t('close')}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-lg flex-col rounded-t-3xl bg-surface shadow-(--shadow-sheet) outline-none sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:animate-fade-in"
      >
        {/* Grab handle — the affordance that says "this can be dragged away". */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-border-strong" />
        </div>

        <div className="flex items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 active:bg-surface-2"
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>

        {footer && (
          <div className="safe-bottom border-t border-border bg-surface px-4 pb-3 pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
