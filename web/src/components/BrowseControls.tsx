'use client'

import { ArrowUpDown, Camera, SlidersHorizontal, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { Sheet } from './Sheet'
import { cn } from '@/lib/cn'
import { formatHeight, localeDigits } from '@/lib/format'

type Option = { code: string; label: string }

const AGE_VALUES = Array.from({ length: 28 }, (_, i) => i + 18)
const HEIGHT_VALUES = Array.from({ length: 31 }, (_, i) => 140 + i * 2)

/** Every multi-select filter, so add/remove/clear/counting stay in one place. */
const LIST_KEYS = ['sub', 'sect', 'city', 'edu', 'occ', 'diet', 'marital', 'mangal', 'gan'] as const
const ALL_KEYS = [...LIST_KEYS, 'ageMin', 'ageMax', 'hMin', 'hMax', 'photo'] as const

export type BrowseTaxonomies = {
  subCommunities: Option[]
  sects: Option[]
  cities: string[]
  educationLevels: Option[]
  occupationTypes: Option[]
  diets: Option[]
}

export function BrowseControls({
  resultCount,
  totalCount,
  taxonomies,
}: {
  resultCount: number
  totalCount: number
  taxonomies: BrowseTaxonomies
}) {
  const t = useTranslations('browse')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const gender = params.get('gender') === 'female' ? 'female' : 'male'

  const activeCount = useMemo(
    () => ALL_KEYS.filter((k) => params.get(k)).length,
    [params],
  )

  const push = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }))
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

  const marital: Option[] = [
    { code: 'never_married', label: tc('neverMarried') },
    { code: 'divorced', label: tc('divorced') },
    { code: 'widowed', label: tc('widowed') },
  ]
  const mangal: Option[] = [
    { code: 'none', label: locale === 'gu' ? 'સાદો' : 'Non-manglik' },
    { code: 'low', label: locale === 'gu' ? 'આંશિક' : 'Partial' },
    { code: 'high', label: locale === 'gu' ? 'મંગળ' : 'Manglik' },
  ]
  const gan: Option[] = [
    { code: 'dev', label: locale === 'gu' ? 'દેવ' : 'Dev' },
    { code: 'manushya', label: locale === 'gu' ? 'મનુષ્ય' : 'Manushya' },
    { code: 'rakshas', label: locale === 'gu' ? 'રાક્ષસ' : 'Rakshas' },
  ]

  /** Flattened active selections, so they can be removed without reopening
   *  the sheet — otherwise a stray filter silently hides half the samaj. */
  const activeChips = useMemo(() => {
    const lookup: Record<string, Option[]> = {
      sub: taxonomies.subCommunities,
      sect: taxonomies.sects,
      city: taxonomies.cities.map((c) => ({ code: c, label: c })),
      edu: taxonomies.educationLevels,
      occ: taxonomies.occupationTypes,
      diet: taxonomies.diets,
      marital,
      mangal,
      gan,
    }
    const chips: Array<{ key: string; code: string; label: string }> = []
    for (const key of LIST_KEYS) {
      for (const code of params.get(key)?.split(',').filter(Boolean) ?? []) {
        const label = lookup[key]?.find((o) => o.code === code)?.label ?? code
        chips.push({ key, code, label })
      }
    }
    if (params.get('photo')) chips.push({ key: 'photo', code: '', label: t('onlyWithPhoto') })
    return chips
  }, [params, taxonomies, marital, mangal, gan, t])

  return (
    <>
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
              'min-h-13 flex-1 rounded-full text-base font-semibold transition-colors duration-150',
              gender === g ? 'bg-primary text-on-primary shadow-sm' : 'text-fg-muted active:bg-surface',
            )}
          >
            {g === 'male' ? t('boys') : t('girls')}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <p
          aria-live="polite"
          className={cn('tabular min-w-0 flex-1 text-sm text-fg-muted', pending && 'opacity-50')}
        >
          {t('resultCount', { count: localeDigits(resultCount, locale) })}
        </p>

        <select
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => setParam('sort', e.target.value === 'newest' ? null : e.target.value)}
          aria-label={t('sortBy')}
          className="min-h-11 rounded-full border-1.5 border-border-strong bg-surface px-3 text-sm font-medium"
        >
          <option value="newest">{t('sortNewestLabel')}</option>
          <option value="age">{t('sortAgeAsc')}</option>
          <option value="ageDesc">{t('sortAgeDesc')}</option>
          <option value="height">{t('sortHeight')}</option>
        </select>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-secondary !min-h-11 shrink-0 !px-3 !text-sm"
        >
          <SlidersHorizontal size={17} aria-hidden />
          <span className="hidden sm:inline">{t('filters')}</span>
          {activeCount > 0 && (
            <span className="tabular rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-on-primary">
              {localeDigits(activeCount, locale)}
            </span>
          )}
        </button>
      </div>

      {activeChips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t('activeFilters')}>
          {activeChips.map((c) => (
            <li key={`${c.key}-${c.code}`}>
              <button
                type="button"
                onClick={() =>
                  c.key === 'photo' ? setParam('photo', null) : toggleInList(c.key, c.code)
                }
                className="chip chip-primary !min-h-9 gap-1.5"
              >
                {c.label}
                <X size={13} aria-hidden />
                <span className="sr-only">{t('removeFilter')}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={clearAll} className="chip !min-h-9 text-danger">
              {t('clearFilters')}
            </button>
          </li>
        </ul>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('filters')}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={clearAll} className="btn btn-secondary flex-1">
              {t('clearFilters')}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary flex-[2]">
              {t('apply')}
              <span className="tabular opacity-80">
                ({localeDigits(resultCount, locale)})
              </span>
            </button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <RangeRow
            label={t('ageRange')}
            anyLabel={t('anyOption')}
            values={AGE_VALUES}
            render={(v) => `${localeDigits(v, locale)} ${t('years')}`}
            min={params.get('ageMin')}
            max={params.get('ageMax')}
            onMin={(v) => setParam('ageMin', v)}
            onMax={(v) => setParam('ageMax', v)}
          />

          <RangeRow
            label={t('heightRange')}
            anyLabel={t('anyOption')}
            values={HEIGHT_VALUES}
            render={(v) => formatHeight(v, locale) ?? String(v)}
            min={params.get('hMin')}
            max={params.get('hMax')}
            onMin={(v) => setParam('hMin', v)}
            onMax={(v) => setParam('hMax', v)}
          />

          <ChipGroup label={t('subCommunity')} options={taxonomies.subCommunities}
            selected={(c) => isSelected('sub', c)} onToggle={(c) => toggleInList('sub', c)} />

          <ChipGroup label={t('sect')} options={taxonomies.sects}
            selected={(c) => isSelected('sect', c)} onToggle={(c) => toggleInList('sect', c)} />

          <ChipGroup label={t('city')} options={taxonomies.cities.map((c) => ({ code: c, label: c }))}
            selected={(c) => isSelected('city', c)} onToggle={(c) => toggleInList('city', c)} />

          <ChipGroup label={t('education')} options={taxonomies.educationLevels}
            selected={(c) => isSelected('edu', c)} onToggle={(c) => toggleInList('edu', c)} />

          <ChipGroup label={t('occupation')} options={taxonomies.occupationTypes}
            selected={(c) => isSelected('occ', c)} onToggle={(c) => toggleInList('occ', c)} />

          <ChipGroup label={t('diet')} options={taxonomies.diets}
            selected={(c) => isSelected('diet', c)} onToggle={(c) => toggleInList('diet', c)} />

          <ChipGroup label={t('marital')} options={marital}
            selected={(c) => isSelected('marital', c)} onToggle={(c) => toggleInList('marital', c)} />

          {/* The two astro questions the group asks by name on every biodata. */}
          <ChipGroup label={t('mangal')} options={mangal}
            selected={(c) => isSelected('mangal', c)} onToggle={(c) => toggleInList('mangal', c)} />

          <ChipGroup label={t('gan')} options={gan}
            selected={(c) => isSelected('gan', c)} onToggle={(c) => toggleInList('gan', c)} />

          <button
            type="button"
            onClick={() => setParam('photo', params.get('photo') ? null : '1')}
            aria-pressed={Boolean(params.get('photo'))}
            className={cn(
              'flex min-h-13 w-full items-center gap-3 rounded-xl border px-4 text-start font-medium transition-colors duration-150',
              params.get('photo')
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface text-fg',
            )}
          >
            <Camera size={19} aria-hidden className="shrink-0" />
            <span className="flex-1">{t('onlyWithPhoto')}</span>
            <span
              aria-hidden
              className={cn(
                'h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors duration-150',
                params.get('photo') ? 'bg-primary' : 'bg-border-strong',
              )}
            >
              <span
                className={cn(
                  'block size-5 rounded-full bg-white transition-transform duration-150',
                  params.get('photo') && 'translate-x-5',
                )}
              />
            </span>
          </button>

          <p className="tabular flex items-center gap-2 pb-2 text-sm text-fg-subtle">
            <ArrowUpDown size={15} aria-hidden />
            {t('showing', {
              count: localeDigits(resultCount, locale),
              total: localeDigits(totalCount, locale),
            })}
          </p>
        </div>
      </Sheet>
    </>
  )
}

function RangeRow({
  label,
  anyLabel,
  values,
  render,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string
  anyLabel: string
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
          <option value="">{anyLabel}</option>
          {values.map((v) => (
            <option key={v} value={v}>{render(v)}</option>
          ))}
        </select>
        <span aria-hidden className="text-fg-subtle">—</span>
        <select
          className="field-input flex-1"
          value={max ?? ''}
          onChange={(e) => onMax(e.target.value || null)}
          aria-label={`${label} — max`}
        >
          <option value="">{anyLabel}</option>
          {values.map((v) => (
            <option key={v} value={v}>{render(v)}</option>
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
