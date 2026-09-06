import 'server-only'
import { FIXTURE_PROFILES } from './fixtures'
import { supabaseConfigured } from './supabase/env'
import { createClient } from './supabase/server'
import type { BrowseFilters, ProfileCard } from './types'

/** Supabase is optional in development. With no credentials the app serves
 *  fixtures, so `npm run dev` works on a fresh clone. */
export const usingFixtures = !supabaseConfigured

/**
 * Every read goes through the request-scoped, cookie-bound client so it runs
 * as the signed-in user and RLS applies. Building a bare anon client here —
 * as this file used to — means no session, and therefore no rows.
 */
const client = createClient

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
    educationLevelCode: r.education_level_code,
    educationLevelGu: r.education_level_gu,
    educationLevelEn: r.education_level_en,
    occupationTypeCode: r.occupation_type_code,
    occupationTypeGu: r.occupation_type_gu,
    occupationTypeEn: r.occupation_type_en,
    dietCode: r.diet_code,
    dietGu: r.diet_gu,
    dietEn: r.diet_en,
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

  const anyOf = (values: string[] | undefined, pick: (p: ProfileCard) => string | null) =>
    values?.length ? (p: ProfileCard) => values.includes(pick(p) ?? '') : null

  for (const pred of [
    anyOf(f.subCommunity, (p) => p.subCommunityCode),
    anyOf(f.sect, (p) => p.sectCode),
    anyOf(f.city, (p) => p.city),
    anyOf(f.educationLevel, (p) => p.educationLevelCode),
    anyOf(f.occupationType, (p) => p.occupationTypeCode),
    anyOf(f.diet, (p) => p.dietCode),
    anyOf(f.maritalStatus, (p) => p.maritalStatus),
    anyOf(f.mangal, (p) => p.mangal),
    anyOf(f.gan, (p) => p.gan),
  ]) {
    if (pred) out = out.filter(pred)
  }

  if (f.hasPhoto) out = out.filter((p) => p.photoUnlocked)

  const sorters: Record<string, (a: ProfileCard, b: ProfileCard) => number> = {
    age: (a, b) => (a.ageYears ?? 0) - (b.ageYears ?? 0),
    ageDesc: (a, b) => (b.ageYears ?? 0) - (a.ageYears ?? 0),
    height: (a, b) => (b.heightCm ?? 0) - (a.heightCm ?? 0),
  }
  const sorter = f.sort ? sorters[f.sort] : undefined
  return sorter ? [...out].sort(sorter) : out
}

export async function getProfiles(filters: BrowseFilters): Promise<ProfileCard[]> {
  if (usingFixtures) return applyFilters(FIXTURE_PROFILES, filters)

  const supabase = await client()
  let q = supabase.from('v_profile_card').select('*').eq('status', 'active').eq('gender', filters.gender)

  const inList: Array<[string, string[] | undefined]> = [
    ['sub_community_code', filters.subCommunity],
    ['sect_code', filters.sect],
    ['city', filters.city],
    ['education_level_code', filters.educationLevel],
    ['occupation_type_code', filters.occupationType],
    ['diet_code', filters.diet],
    ['marital_status', filters.maritalStatus],
    ['mangal', filters.mangal],
    ['gan', filters.gan],
  ]
  for (const [column, values] of inList) {
    if (values?.length) q = q.in(column, values)
  }

  if (filters.heightMinCm != null) q = q.gte('height_cm', filters.heightMinCm)
  if (filters.heightMaxCm != null) q = q.lte('height_cm', filters.heightMaxCm)
  if (filters.ageMin != null) q = q.gte('age_years', filters.ageMin)
  if (filters.ageMax != null) q = q.lte('age_years', filters.ageMax)
  if (filters.hasPhoto) q = q.not('photo_key', 'is', null)

  q =
    filters.sort === 'age'
      ? q.order('age_years')
      : filters.sort === 'ageDesc'
        ? q.order('age_years', { ascending: false })
        : filters.sort === 'height'
          ? q.order('height_cm', { ascending: false })
          : q.order('public_ref', { ascending: false })

  const { data, error } = await q.limit(100)
  if (error) throw new Error(`getProfiles: ${error.message}`)
  return (data ?? []).map(rowToCard)
}

export async function getProfileByRef(ref: string): Promise<ProfileCard | null> {
  if (usingFixtures) return FIXTURE_PROFILES.find((p) => p.publicRef === ref) ?? null

  const supabase = await client()
  const { data, error } = await supabase
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

  const supabase = await client()
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
  diet: [
    { code: 'veg', gu: 'શાકાહારી', en: 'Vegetarian' },
    { code: 'jain', gu: 'જૈન', en: 'Jain' },
    { code: 'eggetarian', gu: 'ઈંડા સહિત', en: 'Eggetarian' },
    { code: 'nonveg', gu: 'માંસાહારી', en: 'Non-vegetarian' },
  ],
  education_level: [
    { code: 'below_12', gu: '૧૨ ધોરણથી ઓછું', en: 'Below 12th' },
    { code: 'hsc', gu: '૧૨ પાસ', en: '12th Pass' },
    { code: 'diploma', gu: 'ડિપ્લોમા', en: 'Diploma' },
    { code: 'graduate', gu: 'સ્નાતક', en: 'Graduate' },
    { code: 'post_graduate', gu: 'અનુસ્નાતક', en: 'Post Graduate' },
    { code: 'professional', gu: 'પ્રોફેશનલ (CA/MBBS/LLB)', en: 'Professional (CA/MBBS/LLB)' },
  ],
  occupation_type: [
    { code: 'job', gu: 'નોકરી', en: 'Job' },
    { code: 'business', gu: 'ધંધો', en: 'Business' },
    { code: 'professional', gu: 'પ્રોફેશનલ', en: 'Professional' },
    { code: 'student', gu: 'અભ્યાસ કરે છે', en: 'Student' },
    { code: 'not_working', gu: 'કામ કરતા નથી', en: 'Not working' },
  ],
}

export type TaxonomyKind =
  | 'sub_community' | 'sect' | 'diet' | 'education_level' | 'occupation_type'

export async function getTaxonomy(
  kind: TaxonomyKind,
  locale: string,
): Promise<{ code: string; label: string }[]> {
  if (usingFixtures) {
    return FIXTURE_TAXONOMY[kind].map((t) => ({
      code: t.code,
      label: locale === 'gu' ? t.gu : t.en,
    }))
  }

  const supabase = await client()
  const { data, error } = await supabase
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
  const supabase = await client()
  const { data } = await supabase.from('v_profile_card').select('city').eq('status', 'active')
  return [...new Set((data ?? []).map((r: { city: string | null }) => r.city).filter(Boolean) as string[])].sort()
}
