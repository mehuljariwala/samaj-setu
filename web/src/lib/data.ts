import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { FIXTURE_PROFILES } from './fixtures'
import type { BrowseFilters, ProfileCard } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Supabase is optional in development. With no credentials the app serves
 *  fixtures, so `npm run dev` works on a fresh clone. */
export const usingFixtures = !url || !anonKey

function client() {
  return createClient(url!, anonKey!, { auth: { persistSession: false } })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToCard(r: any): ProfileCard {
  return {
    id: r.id,
    publicRef: r.public_ref,
    status: r.status,
    fullNameGu: r.full_name_gu,
    fullNameEn: r.full_name_en,
    gender: r.gender,
    ageYears: r.age_years,
    heightCm: r.height_cm,
    city: r.city,
    educationDetail: r.education_detail,
    occupationDetail: r.occupation_detail,
    maritalStatus: r.marital_status,
    subCommunityCode: r.sub_community_code,
    subCommunityGu: r.sub_community_gu,
    subCommunityEn: r.sub_community_en,
    sectCode: r.sect_code,
    sectGu: r.sect_gu,
    sectEn: r.sect_en,
    mosalName: r.mosal_name,
    mosalSurname: r.mosal_surname,
    paternalSurname: r.paternal_surname,
    fatherName: r.father_name,
    motherName: r.mother_name,
    rashi: r.rashi,
    gan: r.gan,
    mangal: r.mangal,
    astroConfidence: r.astro_confidence,
    photoKey: r.photo_key,
    photoBlurKey: r.photo_blur_key,
    // RLS returns photo_key only when the viewer is allowed to see it, so a
    // non-null value here IS the authorization result.
    photoUnlocked: Boolean(r.photo_key),
  }
}

function applyFilters(rows: ProfileCard[], f: BrowseFilters): ProfileCard[] {
  let out = rows.filter((p) => p.status === 'active' && p.gender === f.gender)

  if (f.ageMin != null) out = out.filter((p) => (p.ageYears ?? 0) >= f.ageMin!)
  if (f.ageMax != null) out = out.filter((p) => (p.ageYears ?? 999) <= f.ageMax!)
  if (f.heightMinCm != null) out = out.filter((p) => (p.heightCm ?? 0) >= f.heightMinCm!)
  if (f.heightMaxCm != null) out = out.filter((p) => (p.heightCm ?? 999) <= f.heightMaxCm!)
  if (f.subCommunity?.length)
    out = out.filter((p) => f.subCommunity!.includes(p.subCommunityCode ?? ''))
  if (f.sect?.length) out = out.filter((p) => f.sect!.includes(p.sectCode ?? ''))
  if (f.city?.length) out = out.filter((p) => f.city!.includes(p.city ?? ''))

  if (f.sort === 'age') out = [...out].sort((a, b) => (a.ageYears ?? 0) - (b.ageYears ?? 0))
  return out
}

export async function getProfiles(filters: BrowseFilters): Promise<ProfileCard[]> {
  if (usingFixtures) return applyFilters(FIXTURE_PROFILES, filters)

  let q = client().from('v_profile_card').select('*').eq('status', 'active').eq('gender', filters.gender)

  if (filters.subCommunity?.length) q = q.in('sub_community_code', filters.subCommunity)
  if (filters.sect?.length) q = q.in('sect_code', filters.sect)
  if (filters.city?.length) q = q.in('city', filters.city)
  if (filters.heightMinCm != null) q = q.gte('height_cm', filters.heightMinCm)
  if (filters.heightMaxCm != null) q = q.lte('height_cm', filters.heightMaxCm)
  if (filters.ageMin != null) q = q.gte('age_years', filters.ageMin)
  if (filters.ageMax != null) q = q.lte('age_years', filters.ageMax)

  q = filters.sort === 'age' ? q.order('age_years') : q.order('public_ref', { ascending: false })

  const { data, error } = await q.limit(100)
  if (error) throw new Error(`getProfiles: ${error.message}`)
  return (data ?? []).map(rowToCard)
}

export async function getProfileByRef(ref: string): Promise<ProfileCard | null> {
  if (usingFixtures) return FIXTURE_PROFILES.find((p) => p.publicRef === ref) ?? null

  const { data, error } = await client()
    .from('v_profile_card')
    .select('*')
    .eq('public_ref', ref)
    .maybeSingle()

  if (error) throw new Error(`getProfileByRef: ${error.message}`)
  return data ? rowToCard(data) : null
}

export async function getCounts(): Promise<{ male: number; female: number }> {
  if (usingFixtures) {
    const active = FIXTURE_PROFILES.filter((p) => p.status === 'active')
    return {
      male: active.filter((p) => p.gender === 'male').length,
      female: active.filter((p) => p.gender === 'female').length,
    }
  }

  const supabase = client()
  const [male, female] = await Promise.all(
    (['male', 'female'] as const).map((g) =>
      supabase
        .from('v_profile_card')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('gender', g),
    ),
  )
  return { male: male.count ?? 0, female: female.count ?? 0 }
}

const FIXTURE_TAXONOMY: Record<string, { code: string; gu: string; en: string }[]> = {
  sub_community: [
    { code: 'surti', gu: 'સુરતી ખત્રી', en: 'Surti Khatri' },
    { code: 'khambhati', gu: 'ખંભાતી ખત્રી', en: 'Khambhati Khatri' },
    { code: 'ahmedabadi', gu: 'અમદાવાદી ખત્રી', en: 'Ahmedabadi Khatri' },
    { code: 'indori', gu: 'ઈન્દોરી ખત્રી', en: 'Indori Khatri' },
  ],
  sect: [
    { code: 'bhagat', gu: 'ભગત', en: 'Bhagat' },
    { code: 'jagat', gu: 'જગત', en: 'Jagat' },
  ],
}

export async function getTaxonomy(
  kind: 'sub_community' | 'sect',
  locale: string,
): Promise<{ code: string; label: string }[]> {
  if (usingFixtures) {
    return FIXTURE_TAXONOMY[kind].map((t) => ({
      code: t.code,
      label: locale === 'gu' ? t.gu : t.en,
    }))
  }

  const { data, error } = await client()
    .from('taxonomy_terms')
    .select('code,label_gu,label_en')
    .eq('kind', kind)
    .order('sort_order')

  if (error) throw new Error(`getTaxonomy(${kind}): ${error.message}`)
  return (data ?? []).map((t: { code: string; label_gu: string; label_en: string }) => ({
    code: t.code,
    label: locale === 'gu' ? t.label_gu : t.label_en,
  }))
}

/** Distinct cities present in the data, for the filter sheet. */
export async function getCities(): Promise<string[]> {
  if (usingFixtures) {
    return [...new Set(FIXTURE_PROFILES.map((p) => p.city).filter(Boolean) as string[])].sort()
  }
  const { data } = await client().from('v_profile_card').select('city').eq('status', 'active')
  return [...new Set((data ?? []).map((r: { city: string | null }) => r.city).filter(Boolean) as string[])].sort()
}
