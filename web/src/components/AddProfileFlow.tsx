'use client'

import {
  ArrowLeft,
  ClipboardPaste,
  Loader2,
  PencilLine,
  TriangleAlert,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ProfileForm, type FormTaxonomies } from './ProfileForm'
import { fromParsed, prefilledKeys, type ProfileFormData } from '@/lib/profileForm'
import type { ParsedBiodata } from '@/lib/normalise'

type Mode = 'choose' | 'paste' | 'form'

/**
 * One form, two ways to fill it.
 *
 * Pasting is an accelerator that seeds the same form, not a parallel flow —
 * so a family who pastes still walks the same review steps, and a family who
 * has nothing to paste is never stuck.
 */
export function AddProfileFlow({ taxonomies }: { taxonomies: FormTaxonomies }) {
  const t = useTranslations('form')
  const ti = useTranslations('import')

  const [mode, setMode] = useState<Mode>('choose')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seed, setSeed] = useState<{ data: ProfileFormData; keys: string[] } | null>(null)

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) setRaw(text)
    } catch {
      // Permission denied or unsupported; the textarea still works.
    }
  }

  async function parseAndContinue() {
    if (!raw.trim()) {
      setError(ti('emptyError'))
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
      const parsed = (await res.json()).parsed as ParsedBiodata
      setSeed({ data: fromParsed(parsed), keys: [...prefilledKeys(parsed)] })
      setMode('form')
    } catch {
      setError(ti('parseError'))
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'form') {
    return (
      <ProfileForm initial={seed?.data} prefilled={seed?.keys} taxonomies={taxonomies} />
    )
  }

  if (mode === 'paste') {
    return (
      <div className="animate-rise">
        <button
          type="button"
          onClick={() => setMode('choose')}
          className="btn btn-ghost -ml-3 !min-h-11 !px-3 !text-sm"
        >
          <ArrowLeft size={18} aria-hidden />
          {t('back')}
        </button>

        <h2 className="mt-2 text-xl font-bold">{ti('pasteTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{ti('pasteHelp')}</p>

        <button type="button" onClick={pasteFromClipboard} className="btn btn-secondary mt-4 w-full">
          <ClipboardPaste size={20} aria-hidden />
          {ti('pasteButton')}
        </button>

        <label htmlFor="biodata" className="field-label mt-4">
          {ti('pasteTitle')}
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
          placeholder={ti('pastePlaceholder')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'biodata-error' : undefined}
          className="field-input leading-relaxed"
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
          onClick={parseAndContinue}
          disabled={busy}
          className="btn btn-primary mt-4 w-full"
        >
          {busy && <Loader2 size={20} aria-hidden className="animate-spin" />}
          {busy ? ti('reading') : ti('readIt')}
        </button>

        <button
          type="button"
          onClick={() => setMode('form')}
          className="btn btn-ghost mt-2 w-full !text-sm"
        >
          {ti('orFillManually')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-rise">
      <h2 className="text-xl font-bold">{t('chooseTitle')}</h2>
      <p className="mt-2 text-sm text-fg-muted">{t('chooseHelp')}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PathCard
          icon={<PencilLine size={26} aria-hidden />}
          title={t('chooseForm')}
          hint={t('chooseFormHint')}
          onClick={() => setMode('form')}
          primary
        />
        <PathCard
          icon={<ClipboardPaste size={26} aria-hidden />}
          title={t('choosePaste')}
          hint={t('choosePasteHint')}
          onClick={() => setMode('paste')}
        />
      </div>
    </div>
  )
}

function PathCard({
  icon,
  title,
  hint,
  onClick,
  primary,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? 'flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-primary p-5 text-left text-on-primary shadow-(--shadow-card) transition-transform duration-150 active:scale-[0.985]'
          : 'card card-interactive flex flex-col items-start gap-3 p-5 text-left transition-transform duration-150 active:scale-[0.985]'
      }
    >
      <span
        className={
          primary
            ? 'flex size-12 items-center justify-center rounded-xl bg-white/15'
            : 'flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary'
        }
      >
        {icon}
      </span>
      <span>
        <span className="block text-lg font-bold">{title}</span>
        <span className={primary ? 'mt-0.5 block text-sm text-white/85' : 'mt-0.5 block text-sm text-fg-muted'}>
          {hint}
        </span>
      </span>
    </button>
  )
}
