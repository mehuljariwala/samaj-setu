'use client'

import { Check, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Form primitives. Rules applied throughout, from the accessibility ruleset:
 * every input has a visible label (never placeholder-only), helper text is
 * persistent rather than a tooltip, errors sit directly below the field they
 * belong to and are announced, and every control clears 48px.
 */

function FieldWrap({
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  optionalLabel?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        ) : optionalLabel ? (
          <span className="ml-1 font-normal text-fg-subtle">({optionalLabel})</span>
        ) : null}
      </label>

      {children}

      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm leading-snug text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger"
        >
          <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

type Common = {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  optionalLabel?: string
}

export function TextField({
  value,
  onChange,
  placeholder,
  inputMode,
  autoComplete,
  type = 'text',
  ...f
}: Common & {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: 'text' | 'tel' | 'numeric' | 'email'
  autoComplete?: string
  type?: string
}) {
  return (
    <FieldWrap {...f}>
      <input
        id={f.id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        // Lets the browser render Gujarati or Latin in the right direction
        // without us guessing which the user will type.
        dir="auto"
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.error ? `${f.id}-error` : f.hint ? `${f.id}-hint` : undefined}
        className="field-input"
      />
    </FieldWrap>
  )
}

export function TextAreaField({
  value,
  onChange,
  placeholder,
  rows = 3,
  ...f
}: Common & {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <FieldWrap {...f}>
      <textarea
        id={f.id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        dir="auto"
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.error ? `${f.id}-error` : f.hint ? `${f.id}-hint` : undefined}
        className="field-input leading-relaxed"
      />
    </FieldWrap>
  )
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  ...f
}: Common & {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <FieldWrap {...f}>
      {/* Native select on purpose: Android renders it as a full-screen picker
          with large rows, which beats any custom dropdown for this audience. */}
      <select
        id={f.id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(f.error)}
        aria-describedby={f.error ? `${f.id}-error` : f.hint ? `${f.id}-hint` : undefined}
        className={cn('field-input', !value && 'text-fg-subtle')}
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  )
}

/** Pill choices for a taxonomy with a handful of options. */
export function ChipChoice({
  value,
  onChange,
  options,
  ...f
}: Omit<Common, 'id'> & {
  id: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <fieldset>
      <legend className="field-label">
        {f.label}
        {f.required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </legend>

      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'min-h-12 rounded-full border px-4 text-base font-medium transition-colors duration-150',
                on
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border-strong bg-surface text-fg hover:bg-surface-2',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      {f.hint && !f.error && (
        <p className="mt-1.5 text-sm leading-snug text-fg-muted">{f.hint}</p>
      )}
      {f.error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
          <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
          {f.error}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Full-width stacked choices — the default for a single-answer screen.
 *
 * Preferred over a native select wherever the options fit on screen: the
 * label sits on one line at full reading size instead of being squeezed into
 * a half-width tile, and the whole row is the tap target. That
 * matters for an audience who are largely 45-65 and reading Gujarati at arm's
 * length.
 */
export function OptionList({
  value,
  onChange,
  options,
  ...f
}: Omit<Common, 'id'> & {
  id: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string; hint?: string }>
}) {
  return (
    <fieldset>
      {f.label && (
        <legend className="field-label">
          {f.label}
          {f.required && (
            <span className="text-danger" aria-hidden>
              {' '}
              *
            </span>
          )}
        </legend>
      )}

      <div role="radiogroup" aria-label={f.label} className="space-y-2.5">
        {options.map((o) => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors duration-150',
                on
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-surface hover:border-border-strong',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-lg font-semibold',
                    on ? 'text-primary' : 'text-fg',
                  )}
                >
                  {o.label}
                </span>
                {o.hint && (
                  <span className="mt-0.5 block text-sm leading-snug text-fg-muted">
                    {o.hint}
                  </span>
                )}
              </span>

              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150',
                  on ? 'border-primary bg-primary text-on-primary' : 'border-border-strong',
                )}
                aria-hidden
              >
                {on && <Check size={15} strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>

      {f.hint && !f.error && (
        <p className="mt-2 text-sm leading-snug text-fg-muted">{f.hint}</p>
      )}
      {f.error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-danger">
          <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
          {f.error}
        </p>
      )}
    </fieldset>
  )
}

export function CheckboxField({
  id,
  checked,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors duration-150 hover:bg-surface-2"
    >
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150',
          checked ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
        )}
        aria-hidden
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="text-sm leading-relaxed">{label}</span>
    </label>
  )
}
