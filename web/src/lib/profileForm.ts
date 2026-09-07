import { ageFromDob, type ParsedBiodata } from './normalise'

/** Mirrors the columns in `profiles`, `profile_family`, `profile_astro` and
 *  `profile_contacts`. Everything is a string because it comes from inputs;
 *  coercion happens once, at submit. */
export type ProfileFormData = {
  relation: string
  gender: string
  fullNameGu: string
  fullNameEn: string

  dob: string
  birthTime: string
  birthTimeUnknown: boolean
  birthPlaceText: string
  heightCm: string
  maritalStatus: string

  subCommunity: string
  sect: string
  diet: string
  educationLevel: string
  educationDetail: string
  occupationType: string
  occupationDetail: string
  employer: string
  city: string

  fatherName: string
  motherName: string
  mosalName: string
  nativePlace: string
  brothersCount: string
  sistersCount: string

  rashi: string
  gan: string
  mangal: string
  phones: Array<{ kind: string; value: string }>
  address: string

  consentListing: boolean
  candidateConfirmed: boolean
}

export const EMPTY_FORM: ProfileFormData = {
  relation: '',
  gender: '',
  fullNameGu: '',
  fullNameEn: '',
  dob: '',
  birthTime: '',
  birthTimeUnknown: false,
  birthPlaceText: '',
  heightCm: '',
  maritalStatus: 'never_married',
  subCommunity: '',
  sect: '',
  diet: '',
  educationLevel: '',
  educationDetail: '',
  occupationType: '',
  occupationDetail: '',
  employer: '',
  city: '',
  fatherName: '',
  motherName: '',
  mosalName: '',
  nativePlace: '',
  brothersCount: '',
  sistersCount: '',
  rashi: '',
  gan: '',
  mangal: '',
  phones: [{ kind: 'father_mobile', value: '' }],
  address: '',
  consentListing: false,
  candidateConfirmed: false,
}

/**
 * One question per screen.
 *
 * This used to be six screens of eight-or-nine stacked fields, which is where
 * the form lost people: a parent on a phone saw a wall of inputs and closed
 * it. The fields and the validation rules below are unchanged — only how many
 * of them a family is asked to hold in their head at once.
 *
 * `mosal` gets a screen to itself deliberately. A shared mosal disqualifies a
 * match outright, so it is not a field to bury between "mother's name" and
 * "native place".
 */
export type StepId =
  | 'relation' | 'gender' | 'name' | 'dob' | 'birth' | 'body'
  | 'subCommunity' | 'sect' | 'education' | 'occupation' | 'place'
  | 'parents' | 'mosal' | 'familyExtra' | 'astro' | 'contact' | 'review'

export const STEPS: readonly StepId[] = [
  'relation', 'gender', 'name', 'dob', 'birth', 'body',
  'subCommunity', 'sect', 'education', 'occupation', 'place',
  'parents', 'mosal', 'familyExtra', 'astro', 'contact', 'review',
] as const

export const STEP_COUNT = STEPS.length

export type FormErrors = Partial<Record<keyof ProfileFormData, string>>

/**
 * Per-screen validation. Deliberately lean: this audience abandons a form that
 * nags. Only fields that make a profile unusable — or unmatched — are required.
 */
export function validateStep(
  step: StepId,
  d: ProfileFormData,
  msg: { required: string; consent: string },
): FormErrors {
  const e: FormErrors = {}
  const need = (k: keyof ProfileFormData) => {
    if (!String(d[k] ?? '').trim()) e[k] = msg.required
  }

  switch (step) {
    case 'relation':
      need('relation')
      break

    case 'gender':
      need('gender')
      break

    case 'name':
      if (!d.fullNameGu.trim() && !d.fullNameEn.trim()) e.fullNameGu = msg.required
      break

    case 'dob':
      need('dob')
      break

    case 'birth':
      // Birth time is either given or explicitly waived — a silently blank one
      // produces a confidently wrong kundali later.
      if (!d.birthTimeUnknown && !d.birthTime) e.birthTime = msg.required
      break

    case 'body':
      need('heightCm')
      break

    case 'subCommunity':
      need('subCommunity')
      break

    case 'sect':
      need('sect')
      break

    case 'education':
      need('educationLevel')
      break

    case 'occupation':
      need('occupationType')
      break

    case 'place':
      need('city')
      break

    case 'parents':
      need('fatherName')
      need('motherName')
      break

    case 'mosal':
      need('mosalName')
      break

    case 'contact':
      if (!d.phones.some((p) => p.value.trim())) e.phones = msg.required
      break

    case 'review':
      if (!d.consentListing || !d.candidateConfirmed) e.consentListing = msg.consent
      break

    // Everything on these screens is optional.
    case 'familyExtra':
    case 'astro':
      break
  }

  return e
}

export function computedAge(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const age = ageFromDob(dob)
  return age >= 0 && age < 120 ? age : null
}

/** Seeds the form from a pasted biodata so paste becomes an accelerator for
 *  the same form, rather than a parallel flow with its own review screen. */
export function fromParsed(p: ParsedBiodata): ProfileFormData {
  return {
    ...EMPTY_FORM,
    gender: p.gender ?? '',
    fullNameGu: p.fullNameGu ?? '',
    fullNameEn: p.fullNameEn ?? '',
    dob: p.dob ?? '',
    birthTime: p.birthTime ?? '',
    birthTimeUnknown: !p.birthTime,
    birthPlaceText: p.birthPlaceText ?? '',
    heightCm: p.heightCm ? String(p.heightCm) : '',
    sect: p.sectRaw === 'bhagat' || p.sectRaw === 'jagat' ? p.sectRaw : '',
    educationDetail: p.educationDetail ?? '',
    occupationDetail: p.occupationDetail ?? '',
    fatherName: p.fatherName ?? '',
    motherName: p.motherName ?? '',
    mosalName: p.mosalName ?? '',
    rashi: p.rashiRaw ?? '',
    address: p.address ?? '',
    phones: p.phones.length ? p.phones : EMPTY_FORM.phones,
  }
}

/** Field keys the paste filled in, so the form can mark them "please check". */
export function prefilledKeys(p: ParsedBiodata): Set<keyof ProfileFormData> {
  const d = fromParsed(p)
  const keys = new Set<keyof ProfileFormData>()
  for (const k of Object.keys(EMPTY_FORM) as Array<keyof ProfileFormData>) {
    if (k === 'phones') {
      if (p.phones.length) keys.add(k)
      continue
    }
    if (typeof d[k] === 'string' && d[k] !== EMPTY_FORM[k]) keys.add(k)
  }
  return keys
}

// v2: drafts used to store a numeric index into a six-step flow. Restoring one
// into the screen list above would drop a family on an unrelated question, so
// the old key is abandoned rather than migrated.
const DRAFT_KEY = 'samaj-setu:profile-draft-v2'

/** Long form on a phone: an accidental back-swipe must not cost 20 answers. */
export function saveDraft(d: ProfileFormData, step: StepId) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, step, at: Date.now() }))
  } catch {
    // Private browsing or a full quota — losing autosave is not fatal.
  }
}

export function loadDraft(): { d: ProfileFormData; step: StepId } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { d: ProfileFormData; step: StepId; at: number }
    // A month-old draft is noise, not a rescue.
    if (Date.now() - parsed.at > 30 * 24 * 60 * 60 * 1000) return null
    // Guard against a renamed screen in a future release.
    const step = STEPS.includes(parsed.step) ? parsed.step : STEPS[0]
    return { d: { ...EMPTY_FORM, ...parsed.d }, step }
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* no-op */
  }
}
