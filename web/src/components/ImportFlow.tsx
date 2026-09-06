'use client'

import {
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  TriangleAlert,
  ArrowLeft,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { formatHeight, localeDigits } from '@/lib/format'
import type { ParsedBiodata } from '@/lib/normalise'

type Step = 'paste' | 'review' | 'done'

export function ImportFlow() {
  const t = useTranslations('import')
  const tp = useTranslations('profile')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [step, setStep] = useState<Step>('paste')
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedBiodata | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** One tap instead of a long-press-drag-select on a 6" screen. */
  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) setRaw(text)
    } catch {
      // Clipboard permission denied or unsupported — the textarea still works.
    }
  }

  async function submit() {
    if (!raw.trim()) {
      setError(t('emptyError'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: raw }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setParsed((await res.json()).parsed as ParsedBiodata)
      setStep('review')
    } catch {
      setError(t('parseError'))
    } finally {
      setBusy(false)
    }
  }

  const totalSteps = 3
  const currentIndex = step === 'paste' ? 1 : step === 'review' ? 2 : 3

  return (
    <div className="pb-8">
      {/* Multi-step flows need a visible position indicator, otherwise the
          user can't tell how much is left and abandons partway. */}
      <div className="mb-4 flex items-center gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-200',
              n <= currentIndex ? 'bg-primary' : 'bg-border',
            )}
          />
        ))}
      </div>
      <p className="mb-4 text-sm text-fg-muted">
        {t('step', {
          current: localeDigits(currentIndex, locale),
          total: localeDigits(totalSteps, locale),
        })}
      </p>

      {step === 'paste' && (
        <div className="animate-rise">
          <h2 className="text-xl font-bold">{t('pasteTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('pasteHelp')}</p>

          <button
            type="button"
            onClick={pasteFromClipboard}
            className="btn btn-secondary mt-4 w-full"
          >
            <ClipboardPaste size={20} aria-hidden />
            {t('pasteButton')}
          </button>

          <label htmlFor="biodata" className="field-label mt-4">
            {t('pasteTitle')}
          </label>
          <textarea
            id="biodata"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              if (error) setError(null)
            }}
            rows={10}
            dir="auto"
            placeholder={t('pastePlaceholder')}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'biodata-error' : undefined}
            className="field-input font-normal leading-relaxed"
          />

          {error && (
            <p
              id="biodata-error"
              role="alert"
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger"
            >
              <TriangleAlert size={16} aria-hidden />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn btn-primary mt-4 w-full"
          >
            {busy && <Loader2 size={20} aria-hidden className="animate-spin" />}
            {busy ? t('reading') : t('readIt')}
          </button>
        </div>
      )}

      {step === 'review' && parsed && (
        <div className="animate-rise">
          <h2 className="text-xl font-bold">{t('reviewTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('reviewHelp')}</p>

          <dl className="mt-4 space-y-2">
            <ReviewRow label={tp('name')} value={parsed.fullNameGu} />
            <ReviewRow
              label={tp('dob')}
              value={parsed.dob ? localeDigits(isoToDmy(parsed.dob), locale) : null}
              flagged={parsed.warnings.includes('dob')}
              flagLabel={t('needsCheck')}
            />
            <ReviewRow
              label={tp('age')}
              value={parsed.age != null ? localeDigits(parsed.age, locale) : null}
              flagged={parsed.warnings.includes('age')}
              flagLabel={t('needsCheck')}
              hint={
                parsed.warnings.includes('age') && parsed.statedAge != null
                  ? `${localeDigits(parsed.statedAge, locale)} ${locale === 'gu' ? 'લખેલું છે' : 'was stated'}`
                  : undefined
              }
            />
            {/* Birth time drives the entire kundali, so an ambiguous one is
                surfaced loudly rather than silently resolved. */}
            <ReviewRow
              label={tp('birthTime')}
              value={parsed.birthTime ? localeDigits(parsed.birthTime, locale) : null}
              flagged={parsed.warnings.includes('birth_time')}
              flagLabel={t('needsCheck')}
              hint={
                parsed.birthTimeAccuracy !== 'exact'
                  ? locale === 'gu'
                    ? 'સવાર કે સાંજ ચકાસો — જન્માક્ષર આના પર આધારિત છે'
                    : 'Check AM/PM — the kundali depends on it'
                  : undefined
              }
            />
            <ReviewRow label={tp('birthPlace')} value={parsed.birthPlaceText} />
            <ReviewRow
              label={tp('height')}
              value={formatHeight(parsed.heightCm, locale)}
              flagged={parsed.warnings.includes('height')}
              flagLabel={t('needsCheck')}
            />
            <ReviewRow label={tp('study')} value={parsed.educationDetail} />
            <ReviewRow label={tp('occupation')} value={parsed.occupationDetail} />
            <ReviewRow label={tp('fatherName')} value={parsed.fatherName} />
            <ReviewRow label={tp('motherName')} value={parsed.motherName} />
            <ReviewRow label={tp('mosal')} value={parsed.mosalName} emphasis />
            <ReviewRow
              label={tp('contact')}
              value={parsed.phones.map((p) => p.value).join(', ') || null}
              flagged={parsed.warnings.includes('contact')}
              flagLabel={t('needsCheck')}
            />
          </dl>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setStep('paste')}
              className="btn btn-secondary !px-4"
              aria-label={tc('back')}
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setStep('done')}
              className="btn btn-primary flex-1"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="animate-rise flex flex-col items-center py-8 text-center">
          <CheckCircle2 size={56} aria-hidden className="text-success" />
          <h2 className="mt-4 text-xl font-bold">{t('submittedTitle')}</h2>
          <p className="mt-2 max-w-sm text-fg-muted">{t('submittedBody')}</p>
          <Link href="/browse" className="btn btn-primary mt-6 w-full max-w-xs">
            {tc('next')}
          </Link>
        </div>
      )}
    </div>
  )
}

function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function ReviewRow({
  label,
  value,
  flagged,
  flagLabel,
  hint,
  emphasis,
}: {
  label: string
  value: string | null
  flagged?: boolean
  flagLabel?: string
  hint?: string
  emphasis?: boolean
}) {
  const t = useTranslations('import')

  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        flagged ? 'border-warning/40 bg-warning-soft' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-start gap-2">
        <dt className="w-28 shrink-0 text-sm text-fg-muted">{label}</dt>
        <dd
          className={cn(
            'min-w-0 flex-1',
            !value && 'text-fg-subtle',
            emphasis && value && 'font-semibold text-primary',
          )}
        >
          {value || t('missing')}
        </dd>
        {flagged && flagLabel && (
          <span className="chip chip-warning shrink-0 !text-xs">{flagLabel}</span>
        )}
      </div>
      {hint && <p className="mt-1.5 pl-30 text-xs text-warning">{hint}</p>}
    </div>
  )
}
