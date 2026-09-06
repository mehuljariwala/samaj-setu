import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { BrowseControls } from '@/components/BrowseControls'
import { ProfileCardItem } from '@/components/ProfileCardItem'
import { TopBar } from '@/components/TopBar'
import { getCities, getProfiles, getTaxonomy } from '@/lib/data'
import type { BrowseFilters, Gender } from '@/lib/types'

type SearchParams = Record<string, string | string[] | undefined>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

function list(v: string | string[] | undefined): string[] | undefined {
  const parts = one(v)?.split(',').filter(Boolean)
  return parts?.length ? parts : undefined
}

function num(v: string | string[] | undefined): number | undefined {
  const s = one(v)
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

const SORTS = ['age', 'ageDesc', 'height'] as const

function toFilters(sp: SearchParams): BrowseFilters {
  const sort = one(sp.sort)
  return {
    gender: (one(sp.gender) === 'female' ? 'female' : 'male') as Gender,
    ageMin: num(sp.ageMin),
    ageMax: num(sp.ageMax),
    heightMinCm: num(sp.hMin),
    heightMaxCm: num(sp.hMax),
    subCommunity: list(sp.sub),
    sect: list(sp.sect),
    city: list(sp.city),
    educationLevel: list(sp.edu),
    occupationType: list(sp.occ),
    diet: list(sp.diet),
    maritalStatus: list(sp.marital),
    mangal: list(sp.mangal),
    gan: list(sp.gan),
    hasPhoto: Boolean(one(sp.photo)),
    sort: SORTS.includes(sort as (typeof SORTS)[number])
      ? (sort as BrowseFilters['sort'])
      : 'newest',
  }
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  const sp = await searchParams
  const filters = toFilters(sp)
  const t = await getTranslations('browse')

  const [
    profiles,
    unfiltered,
    subCommunities,
    sects,
    cities,
    educationLevels,
    occupationTypes,
    diets,
  ] = await Promise.all([
    getProfiles(filters),
    // Denominator for "showing N of M", so a user can tell whether their own
    // filters are why the list looks empty.
    getProfiles({ gender: filters.gender }),
    getTaxonomy('sub_community', locale),
    getTaxonomy('sect', locale),
    getCities(),
    getTaxonomy('education_level', locale),
    getTaxonomy('occupation_type', locale),
    getTaxonomy('diet', locale),
  ])

  return (
    <>
      <TopBar title={t('title')} />

      <main id="main" className="container-app pad-bottom-nav pt-4">
        <Suspense fallback={<div className="skeleton h-14 rounded-full" />}>
          <BrowseControls
            resultCount={profiles.length}
            totalCount={unfiltered.length}
            taxonomies={{ subCommunities, sects, cities, educationLevels, occupationTypes, diets }}
          />
        </Suspense>

        {profiles.length === 0 ? (
          <div className="mt-12 flex flex-col items-center px-6 text-center">
            <SearchX size={44} aria-hidden className="text-fg-subtle" />
            <p className="mt-4 text-lg font-semibold">{t('noResults')}</p>
            <p className="mt-1 text-sm text-fg-muted">{t('noResultsHint')}</p>
          </div>
        ) : (
          /* Two-up from the smallest screen: a parent comparing candidates
             shouldn't have to scroll a full viewport per profile. */
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {profiles.map((p, i) => (
              <ProfileCardItem key={p.id} profile={p} locale={locale} index={i} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
