export type Gender = 'male' | 'female'
export type MaritalStatus = 'never_married' | 'divorced' | 'widowed'
export type Gan = 'dev' | 'manushya' | 'rakshas'
export type Mangal = 'none' | 'low' | 'high' | 'unknown'
export type AstroConfidence = 'high' | 'medium' | 'low' | 'none'

export type ProfileStatus =
  | 'draft' | 'pending_review' | 'active' | 'paused'
  | 'married' | 'withdrawn' | 'rejected'

/** Mirrors the `v_profile_card` view. Never contains contact details — those
 *  come from a separate, RLS-gated query once an interest is accepted. */
export type ProfileCard = {
  id: string
  publicRef: string
  status: ProfileStatus
  fullNameGu: string | null
  fullNameEn: string | null
  gender: Gender
  ageYears: number | null
  heightCm: number | null
  city: string | null
  educationDetail: string | null
  occupationDetail: string | null
  maritalStatus: MaritalStatus
  subCommunityCode: string | null
  subCommunityGu: string | null
  subCommunityEn: string | null
  sectCode: string | null
  sectGu: string | null
  sectEn: string | null
  educationLevelCode: string | null
  educationLevelGu: string | null
  educationLevelEn: string | null
  occupationTypeCode: string | null
  occupationTypeGu: string | null
  occupationTypeEn: string | null
  dietCode: string | null
  dietGu: string | null
  dietEn: string | null
  mosalName: string | null
  mosalSurname: string | null
  paternalSurname: string | null
  fatherName: string | null
  motherName: string | null
  rashi: string | null
  gan: Gan | null
  mangal: Mangal | null
  astroConfidence: AstroConfidence | null
  photoKey: string | null
  photoBlurKey: string | null
  /** Whether the viewer may see the un-blurred portrait. Resolved server-side. */
  photoUnlocked: boolean
  dob?: string | null
  birthTime?: string | null
  birthPlaceText?: string | null
  nativePlace?: string | null
}

export type BrowseFilters = {
  gender: Gender
  ageMin?: number
  ageMax?: number
  heightMinCm?: number
  heightMaxCm?: number
  subCommunity?: string[]
  sect?: string[]
  city?: string[]
  educationLevel?: string[]
  occupationType?: string[]
  diet?: string[]
  maritalStatus?: string[]
  /** 'none' means non-manglik (સાદો) — the single most-asked question. */
  mangal?: string[]
  gan?: string[]
  /** Only profiles whose family has released a photo. */
  hasPhoto?: boolean
  sort?: 'newest' | 'age' | 'ageDesc' | 'height'
}

/** One renderable reason on a match card. Product principle 4: show the
 *  argument, never a bare percentage. */
export type MatchReason = {
  key: string
  tone: 'good' | 'neutral' | 'warn'
  values?: Record<string, string | number>
}
