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

export const STEP_COUNT = 6

/** Fields owned by each step, so the review screen can jump to the right one. */
export const STEP_FIELDS: Record<number, Array<keyof ProfileFormData>> = {
  1: ['relation', 'gender', 'fullNameGu', 'fullNameEn'],
  2: ['dob', 'birthTime', 'birthTimeUnknown', 'birthPlaceText', 'heightCm', 'maritalStatus'],
  3: ['subCommunity', 'sect', 'diet', 'educationLevel', 'educationDetail',
      'occupationType', 'occupationDetail', 'employer', 'city'],
  4: ['fatherName', 'motherName', 'mosalName', 'nativePlace', 'brothersCount', 'sistersCount'],
  5: ['rashi', 'gan', 'mangal', 'phones', 'address'],
  6: ['consentListing', 'candidateConfirmed'],
}

export type FormErrors = Partial<Record<keyof ProfileFormData, string>>

/**
 * Per-step validation. Deliberately lean: this audience abandons a form that
 * nags. Only fields that make a profile unusable — or unmatched — are required.
 * Mosal is required because a shared mosal disqualifies a match outright, and
 * discovering that three phone calls later wastes both families' time.
 */
export function validateStep(
  step: number,
  d: ProfileFormData,
  msg: { required: string; consent: string },
): FormErrors {
  const e: FormErrors = {}
  const need = (k: keyof ProfileFormData) => {
    if (!String(d[k] ?? '').trim()) e[k] = msg.required
  }

  if (step === 1) {
    need('relation')
    need('gender')
    if (!d.fullNameGu.trim() && !d.fullNameEn.trim()) {
      e.fullNameGu = msg.required
    }
  }

  if (step === 2) {
    need('dob')
    need('heightCm')
    // Birth time is either given or explicitly waived — a silently blank one
    // produces a confidently wrong kundali later.
    if (!d.birthTimeUnknown && !d.birthTime) e.birthTime = msg.required
  }

  if (step === 3) {
    need('subCommunity')
    need('sect')
    need('educationLevel')
    need('occupationType')
    need('city')
  }

  if (step === 4) {
    need('fatherName')
    need('motherName')
    need('mosalName')
  }

  if (step === 5) {
    if (!d.phones.some((p) => p.value.trim())) {
      e.phones = msg.required
    }
  }

  if (step === 6) {
    if (!d.consentListing || !d.candidateConfirmed) {
      e.consentListing = msg.consent
    }
  }

  return e
}

export function isStepValid(step: number, d: ProfileFormData): boolean {
  return Object.keys(validateStep(step, d, { required: 'x', consent: 'x' })).length === 0
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

const DRAFT_KEY = 'samaj-setu:profile-draft'

/** Long form on a phone: an accidental back-swipe must not cost 20 answers. */
export function saveDraft(d: ProfileFormData, step: number) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, step, at: Date.now() }))
  } catch {
    // Private browsing or a full quota — losing autosave is not fatal.
  }
}

export function loadDraft(): { d: ProfileFormData; step: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { d: ProfileFormData; step: number; at: number }
    // A month-old draft is noise, not a rescue.
    if (Date.now() - parsed.at > 30 * 24 * 60 * 60 * 1000) return null
    return { d: { ...EMPTY_FORM, ...parsed.d }, step: parsed.step }
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
