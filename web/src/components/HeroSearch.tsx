'use client'

import { Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { localeDigits } from '@/lib/format'

type Option = { value: string; label: string }

const AGE_BANDS = [
  { value: '21-25', min: 21, max: 25 },
  { value: '25-30', min: 25, max: 30 },
  { value: '30-35', min: 30, max: 35 },
  { value: '35-45', min: 35, max: 45 },
]

/**
 * The search bar that straddles the bottom of the hero — lifted from the
 * reference, and the right call: it puts the primary action exactly where the
 * eye lands instead of making a first-time visitor find the nav.
 *
 * Everything here is a native <select>. On Android each one opens as a
 * full-screen picker with large rows, which is far better for this audience
 * than a custom dropdown.
 */
export function HeroSearch({
  subCommunities,
  sects,
  cities,
}: {
  subCommunities: Option[]
  sects: Option[]
  cities: string[]
}) {
  const t = useTranslations('search')
  const locale = useLocale()
  const router = useRouter()

  const [gender, setGender] = useState('female')
  const [age, setAge] = useState('')
  const [sub, setSub] = useState('')
  const [sect, setSect] = useState('')
  const [city, setCity] = useState('')

  function submit() {
    const params = new URLSearchParams({ gender })
    const band = AGE_BANDS.find((b) => b.value === age)
    if (band) {
      params.set('ageMin', String(band.min))
      params.set('ageMax', String(band.max))
    }
    if (sub) params.set('sub', sub)
    if (sect) params.set('sect', sect)
    if (city) params.set('city', city)
    router.push(`/browse?${params.toString()}` as '/browse')
  }

  return (
    <div className="card p-3 shadow-(--shadow-card-hover) sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto] lg:items-end lg:gap-2">
        <Cell label={t('lookingFor')} id="hs-gender">
          <select
            id="hs-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="hs-select"
          >
            <option value="female">{t('bride')}</option>
            <option value="male">{t('groom')}</option>
          </select>
        </Cell>

        <Cell label={t('ageRange')} id="hs-age">
          <select id="hs-age" value={age} onChange={(e) => setAge(e.target.value)} className="hs-select">
            <option value="">{t('any')}</option>
            {AGE_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {localeDigits(b.min, locale)} – {localeDigits(b.max, locale)}
              </option>
            ))}
          </select>
        </Cell>

        <Cell label={t('community')} id="hs-sub">
          <select id="hs-sub" value={sub} onChange={(e) => setSub(e.target.value)} className="hs-select">
            <option value="">{t('any')}</option>
            {subCommunities.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Cell>

        <Cell label={t('sect')} id="hs-sect">
          <select id="hs-sect" value={sect} onChange={(e) => setSect(e.target.value)} className="hs-select">
            <option value="">{t('any')}</option>
            {sects.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Cell>

        <Cell label={t('city')} id="hs-city">
          <select id="hs-city" value={city} onChange={(e) => setCity(e.target.value)} className="hs-select">
            <option value="">{t('any')}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Cell>

        <button
          type="button"
          onClick={submit}
          className="btn btn-primary w-full sm:col-span-2 lg:col-span-1 lg:w-auto lg:px-7"
        >
          <Search size={20} aria-hidden />
          {t('search')}
        </button>
      </div>
    </div>
  )
}

function Cell({
  label,
  id,
  children,
}: {
  label: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
