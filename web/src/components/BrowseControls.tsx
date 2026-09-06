'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { Sheet } from './Sheet'
import { cn } from '@/lib/cn'
import { formatHeight, localeDigits } from '@/lib/format'

type Option = { code: string; label: string }

const AGE_VALUES = Array.from({ length: 28 }, (_, i) => i + 18) // 18–45
const HEIGHT_VALUES = Array.from({ length: 31 }, (_, i) => 140 + i * 2) // 140–200cm

export function BrowseControls({
  resultCount,
  subCommunities,
  sects,
  cities,
}: {
  resultCount: number
  subCommunities: Option[]
  sects: Option[]
  cities: string[]
}) {
  const t = useTranslations('browse')
  const locale = useLocale()
  const router = useRouter()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const gender = params.get('gender') === 'female' ? 'female' : 'male'

  const activeCount = useMemo(
    () =>
      ['ageMin', 'ageMax', 'hMin', 'hMax', 'sub', 'sect', 'city'].filter((k) =>
        params.get(k),
      ).length,
    [params],
  )

  const push = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        router.replace(`?${next.toString()}`, { scroll: false })
      })
    },
    [router],
  )

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      push(next)
    },
    [params, push],
  )

  const toggleInList = useCallback(
    (key: string, code: string) => {
      const next = new URLSearchParams(params.toString())
      const current = (next.get(key)?.split(',') ?? []).filter(Boolean)
      const updated = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code]
      if (updated.length) next.set(key, updated.join(','))
      else next.delete(key)
      push(next)
    },
    [params, push],
  )

  const isSelected = (key: string, code: string) =>
    (params.get(key)?.split(',') ?? []).includes(code)

  function clearAll() {
    const next = new URLSearchParams()
    next.set('gender', gender)
    push(next)
  }

  return (
    <>
      {/* The single most-used control on the screen, so it gets the most
          space: full width, 56px tall, two states, no dropdown. */}
      <div
        role="group"
        aria-label={t('title')}
        className="flex gap-1 rounded-full border border-border bg-surface-2 p-1"
      >
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={gender === g}
            onClick={() => setParam('gender', g)}
            className={cn(
              'min-h-14 flex-1 rounded-full text-base font-semibold transition-colors duration-150',
              gender === g
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-fg-muted active:bg-surface',
            )}
          >
            {g === 'male' ? t('boys') : t('girls')}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <p
          aria-live="polite"
          className={cn('tabular flex-1 text-sm text-fg-muted', pending && 'opacity-50')}
        >
          {t('resultCount', { count: localeDigits(resultCount, locale) })}
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-secondary !min-h-11 !px-4 !text-sm"
        >
          <SlidersHorizontal size={18} aria-hidden />
          {t('filters')}
          {activeCount > 0 && (
            <span className="tabular ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">
              {localeDigits(activeCount, locale)}
            </span>
          )}
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('filters')}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={clearAll} className="btn btn-secondary flex-1">
              {t('clearFilters')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-primary flex-[2]"
            >
              {t('apply')}
            </button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          {/* Native selects, not range sliders. Android renders these as a
              full-screen picker with large rows — far easier than dragging a
              4px thumb, which is the usual failure mode for this audience. */}
          <RangeRow
            label={t('ageRange')}
            fromLabel={t('anyOption')}
            values={AGE_VALUES}
            render={(v) => `${localeDigits(v, locale)} ${t('years')}`}
            min={params.get('ageMin')}
            max={params.get('ageMax')}
            onMin={(v) => setParam('ageMin', v)}
            onMax={(v) => setParam('ageMax', v)}
          />

          <RangeRow
            label={t('heightRange')}
            fromLabel={t('anyOption')}
            values={HEIGHT_VALUES}
            render={(v) => formatHeight(v, locale) ?? String(v)}
            min={params.get('hMin')}
            max={params.get('hMax')}
            onMin={(v) => setParam('hMin', v)}
            onMax={(v) => setParam('hMax', v)}
          />

          <ChipGroup
            label={t('subCommunity')}
            options={subCommunities}
            selected={(c) => isSelected('sub', c)}
            onToggle={(c) => toggleInList('sub', c)}
          />

          <ChipGroup
            label={t('sect')}
            options={sects}
            selected={(c) => isSelected('sect', c)}
            onToggle={(c) => toggleInList('sect', c)}
          />

          <ChipGroup
            label={t('city')}
            options={cities.map((c) => ({ code: c, label: c }))}
            selected={(c) => isSelected('city', c)}
            onToggle={(c) => toggleInList('city', c)}
          />
        </div>
      </Sheet>
    </>
  )
}

function RangeRow({
  label,
  fromLabel,
  values,
  render,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string
  fromLabel: string
  values: number[]
  render: (v: number) => string
  min: string | null
  max: string | null
  onMin: (v: string | null) => void
  onMax: (v: string | null) => void
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex items-center gap-2">
        <select
          className="field-input flex-1"
          value={min ?? ''}
          onChange={(e) => onMin(e.target.value || null)}
          aria-label={`${label} — min`}
        >
          <option value="">{fromLabel}</option>
          {values.map((v) => (
            <option key={v} value={v}>
              {render(v)}
            </option>
          ))}
        </select>
        <span aria-hidden className="text-fg-subtle">
          —
        </span>
        <select
          className="field-input flex-1"
          value={max ?? ''}
          onChange={(e) => onMax(e.target.value || null)}
          aria-label={`${label} — max`}
        >
          <option value="">{fromLabel}</option>
          {values.map((v) => (
            <option key={v} value={v}>
              {render(v)}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  )
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: Option[]
  selected: (code: string) => boolean
  onToggle: (code: string) => void
}) {
  if (!options.length) return null
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected(o.code)
          return (
            <button
              key={o.code}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.code)}
              className={cn(
                // 48px keeps every chip a legitimate Android touch target.
                'min-h-12 rounded-full border px-4 text-base font-medium transition-colors duration-150',
                on
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border-strong bg-surface text-fg',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
