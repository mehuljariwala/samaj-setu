'use client'

import type { ReactNode } from 'react'

/**
 * The frame every question sits in: one heading, optional help, one answer.
 *
 * Keeping the chrome here rather than in each screen is what stops the flow
 * drifting back into a wall of fields — there is physically nowhere to put a
 * second question.
 */
export function QuestionScreen({
  question,
  help,
  children,
}: {
  question: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="animate-rise">
      {/* tabIndex + focus target: advancing a screen must move a screen
          reader to the new question, not leave it on the Next button. */}
      <h2 tabIndex={-1} className="display text-2xl leading-snug outline-none">
        {question}
      </h2>
      {help && <p className="mt-2 leading-relaxed text-fg-muted">{help}</p>}

      <div className="mt-6 space-y-5">{children}</div>
    </div>
  )
}

/**
 * A single continuous bar rather than one segment per screen. At seventeen
 * screens, segments become slivers that read as decoration; a filled bar plus
 * a "3 / 17" label answers "how much is left" at a glance.
 */
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      className="h-1.5 w-full overflow-hidden rounded-full bg-border"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
