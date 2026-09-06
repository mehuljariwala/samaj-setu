import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { BrowseControls } from '@/components/BrowseControls'
import { ProfileCardItem } from '@/components/ProfileCardItem'
import { TopBar } from '@/components/TopBar'
import { getCities, getProfiles, getTaxonomy } from '@/lib/data'
import type { BrowseFilters, Gender } from '@/lib/types'

type SearchParams = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

function list(v: string | string[] | undefined): string[] | undefined {
  const s = one(v)
  const parts = s?.split(',').filter(Boolean)
  return parts?.length ? parts : undefined
}

function num(v: string | string[] | undefined): number | undefined {
  const s = one(v)
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function toFilters(sp: SearchParams): BrowseFilters {
  return {
    gender: (one(sp.gender) === 'female' ? 'female' : 'male') as Gender,
    ageMin: num(sp.ageMin),
    ageMax: num(sp.ageMax),
    heightMinCm: num(sp.hMin),
    heightMaxCm: num(sp.hMax),
    subCommunity: list(sp.sub),
    sect: list(sp.sect),
    city: list(sp.city),
    sort: one(sp.sort) === 'age' ? 'age' : 'newest',
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

  const [profiles, subCommunities, sects, cities] = await Promise.all([
    getProfiles(filters),
    getTaxonomy('sub_community', locale),
    getTaxonomy('sect', locale),
    getCities(),
  ])

  return (
    <>
      <TopBar title={t('title')} />

      <main id="main" className="container-app pad-bottom-nav pt-4">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-full bg-surface-2" />}>
          <BrowseControls
            resultCount={profiles.length}
            subCommunities={subCommunities}
            sects={sects}
            cities={cities}
          />
        </Suspense>

        {profiles.length === 0 ? (
          <div className="mt-12 flex flex-col items-center px-6 text-center">
            <SearchX size={44} aria-hidden className="text-fg-subtle" />
            <p className="mt-4 text-lg font-semibold">{t('noResults')}</p>
            <p className="mt-1 text-sm text-fg-muted">{t('noResultsHint')}</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p, i) => (
              <ProfileCardItem key={p.id} profile={p} locale={locale} index={i} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
