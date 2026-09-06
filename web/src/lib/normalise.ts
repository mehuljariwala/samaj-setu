/**
 * Stage 1 + 3 of paste-to-profile: deterministic normalisation and derivation.
 * See docs/BIODATA-PARSING.md.
 *
 * Everything here is pure and unit-testable. The LLM (stage 2) only handles
 * what genuinely needs judgement; anything a regex can do reliably is done
 * here, because a regex doesn't hallucinate a birth date.
 */

const GU_TO_LATIN: Record<string, string> = {
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
}

/** WhatsApp export line prefix: `[04/09/26, 10:01:02 PM] ~ Name: ` */
const WA_PREFIX = /^\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(:\d{2})?\s*[AaPp]\.?[Mm]\.?\]\s*~?\s*[^:]{0,40}:\s*/

/** U+200E LRM, U+200F RLM, U+2060 word joiner, U+FEFF BOM, U+00A0 NBSP. */
const INVISIBLES = /[‎‏⁠﻿]/g

/** Emoji section headers and decorative rules used by the "Template B" format. */
const DECORATIONS = [
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, // emoji + ZWJ
  /━+[─—-]*━*/g,
  /^-{3,}$/gm,
]

export function gujaratiDigitsToLatin(s: string): string {
  return s.replace(/[૦-૯]/g, (d) => GU_TO_LATIN[d] ?? d)
}

/** Stage 1. Idempotent. */
export function normalise(raw: string): string {
  let s = raw.replace(/\r\n?/g, '\n')

  s = s
    .split('\n')
    .map((line) => line.replace(WA_PREFIX, ''))
    .join('\n')

  s = s.replace(INVISIBLES, '').replace(/ /g, ' ')
  for (const re of DECORATIONS) s = s.replace(re, '')

  // WhatsApp's in-app truncation marker.
  s = s.replace(/^\s*Read more\s*$/gim, '')

  // Bullet prefixes, and the various dash forms used as separators.
  s = s
    .split('\n')
    .map((line) => line.replace(/^\s*[•▪●*•]+\s*/, '').trimEnd())
    .join('\n')

  s = s.replace(/[‐‑‒–—―]/g, '-')

  return s.replace(/\n{3,}/g, '\n\n').trim()
}

/* --------------------------------------------------------------- labels */

type FieldKey =
  | 'name' | 'father_name' | 'mother_name' | 'mosal' | 'dob' | 'birth_time'
  | 'rashi' | 'age' | 'birth_place' | 'education' | 'height' | 'sect'
  | 'occupation' | 'contact' | 'address' | 'sub_community' | 'marital_status'
  | 'gender'

/**
 * Data-driven on purpose: new label spellings keep appearing in the group and
 * shouldn't require a code change to support.
 */
export const LABEL_ALIASES: Record<FieldKey, string[]> = {
  name: ['છોકરાનું નામ', 'છોકરીનું નામ', 'છોકરા / છોકરીનું નામ', 'છોકરા/છોકરીનું નામ', 'નામ', 'name'],
  father_name: ['પિતા નું નામ', 'પિતાનું નામ', "father's name", 'father name', 'fathers name'],
  mother_name: ['માતાનું નામ', 'માતા નું નામ', "mother's name", 'mother name', 'mothers name'],
  mosal: ['મોસાળ', 'મોસાળ પક્ષ', 'mosal', 'mosaal'],
  dob: ['જન્મ તારીખ', 'જન્મતારીખ', 'date of birth', 'dob', 'birth date'],
  birth_time: ['જન્મ સમય', 'જન્મસમય', 'birth time', 'time of birth'],
  rashi: ['રાશિ', 'rashi', 'raashi', 'moon sign'],
  age: ['ઉંમર', 'ઉમર', 'age'],
  birth_place: ['જન્મ સ્થળ', 'જન્મસ્થળ', 'birth place', 'place of birth'],
  education: ['અભ્યાસ', 'શિક્ષણ', 'study', 'education', 'qualification'],
  height: ['ઊંચાઈ', 'ઉંચાઈ', 'height'],
  sect: ['ભગત /જગત', 'ભગત / જગત', 'ભગત/જગત', 'ભગત જગત', 'bhagat / jagat', 'bhagat/jagat', 'sect'],
  occupation: ['વ્યવસાય ફિલ્ડ સાથે', 'મુખ્ય વ્યવસાય', 'વ્યવસાય', 'ધંધો', 'occupation', 'profession', 'job'],
  contact: ['પિતાનો મોબાઈલ નંબર', 'માતાનો મો. નંબર', 'માતાનો મોબાઈલ નંબર', 'મોબાઈલ નંબર', 'મો. નંબર', 'mobile no', 'mobile number', 'contact', 'phone'],
  address: ['સરનામું', 'address'],
  sub_community: ['સમાજ', 'community', 'caste'],
  marital_status: ['વૈવાહિક સ્થિતિ', 'marital status'],
  gender: ['જાતિ', 'gender'],
}

/** Longest alias first, so "પિતાનો મોબાઈલ નંબર" wins over "મોબાઈલ નંબર". */
const SORTED_ALIASES: Array<[FieldKey, string]> = Object.entries(LABEL_ALIASES)
  .flatMap(([key, aliases]) => aliases.map((a) => [key as FieldKey, a] as [FieldKey, string]))
  .sort((a, b) => b[1].length - a[1].length)

export function matchLabel(label: string): FieldKey | null {
  const l = label.toLowerCase().replace(/[.\s]+/g, ' ').trim()
  for (const [key, alias] of SORTED_ALIASES) {
    const a = alias.toLowerCase().replace(/[.\s]+/g, ' ').trim()
    if (l === a || l.startsWith(a)) return key
  }
  return null
}

const norm = (s: string) => s.toLowerCase().replace(/[.\s]+/g, ' ').trim()

/** Matches `Mobile No. 9574368103` — a known label with no colon after it. */
function matchBareLabel(line: string): { key: FieldKey; value: string } | null {
  const l = norm(line)
  for (const [key, alias] of SORTED_ALIASES) {
    const a = norm(alias)
    if (!l.startsWith(a + ' ')) continue

    const value = line.trim().slice(alias.length).replace(/^[-–—:.\s]+/, '').trim()
    if (/^[+\d]/.test(value)) return { key, value }
  }
  return null
}

/** Splits `label: value`, also handling `label:-value` and `label :‐ value`. */
export function extractFields(normalised: string): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {}

  for (const line of normalised.split('\n')) {
    let key: FieldKey | null = null
    let value: string | null = null

    const m = line.match(/^([^:]{1,60}):+\s*-?\s*(.*)$/)
    if (m) {
      key = matchLabel(m[1])
      value = m[2].replace(/^[-–—:\s]+/, '').trim()
    } else {
      // Some biodatas omit the colon entirely — "Mobile No. 9574368103".
      // Only attempted when there is no colon, so it can't shadow a real
      // `label: value` pair earlier on the same line.
      const bare = matchBareLabel(line)
      if (bare) ({ key, value } = bare)
    }

    if (!key || !value) continue
    if (out[key]) continue // first occurrence wins

    out[key] = value
  }

  // Gender is implied by which name label was used, and that's more reliable
  // than guessing from a first name.
  if (!out.gender) {
    if (/છોકરાનું નામ/.test(normalised)) out.gender = 'male'
    else if (/છોકરીનું નામ/.test(normalised)) out.gender = 'female'
  }

  return out
}

/* ---------------------------------------------------------- derivations */

export function parseHeightToCm(raw: string): number | null {
  const s = gujaratiDigitsToLatin(raw)

  const cm = s.match(/(\d{3})\s*(?:cm|સેમી)/i)
  if (cm) return Number(cm[1])

  // Positional rather than pattern-matched: the unit markers vary far too
  // much to enumerate (5'6" · 5'ft 6"inch · ૫'ફુટ ૫"ઇંચ · ૫'૬ · 5-6 · 5.6),
  // but the first number is always feet and the second, if present, inches.
  const nums = s.match(/\d+/g)?.map(Number) ?? []
  if (!nums.length) return null

  const feet = nums[0]
  if (feet < 3 || feet > 7) return null

  const inches = nums.length > 1 && nums[1] < 12 ? nums[1] : 0
  return Math.round((feet * 12 + inches) * 2.54)
}

export type ParsedTime = {
  time: string | null
  accuracy: 'exact' | 'approx' | 'unknown'
  note?: string
}

/** Gujarati time-of-day qualifiers mapped onto a 12-hour clock. */
const PERIODS: Array<[RegExp, [number, number]]> = [
  [/સવાર/, [4, 11]],
  [/બપોર/, [12, 15]],
  [/સાંજ/, [16, 19]],
  [/રાત|રાત્રિ|રાત્રે/, [20, 3]],
  [/\ba\.?m\.?\b/i, [0, 11]],
  [/\bp\.?m\.?\b/i, [12, 23]],
]

export function parseBirthTime(raw: string): ParsedTime {
  const s = gujaratiDigitsToLatin(raw)
  const hm = s.match(/(\d{1,2})[:.](\d{2})/)
  if (!hm) return { time: null, accuracy: 'unknown' }

  let hour = Number(hm[1])
  const minute = Number(hm[2])
  if (hour > 23 || minute > 59) return { time: null, accuracy: 'unknown' }

  const period = PERIODS.find(([re]) => re.test(s))
  if (!period) {
    // A bare 24-hour-looking time is trustworthy; a bare 12-hour one isn't.
    return {
      time: pad(hour, minute),
      accuracy: hour > 12 ? 'exact' : 'approx',
      note: hour <= 12 ? 'am_pm_missing' : undefined,
    }
  }

  const [, [lo, hi]] = period
  let note: string | undefined

  if (hour <= 12) {
    const wantsPm = lo >= 12 || lo === 20
    if (wantsPm && hour !== 12) hour += 12
    if (!wantsPm && hour === 12) hour = 0
  }

  // "૧૦:૪૬ (સાંજે)" — 10:46 "evening" is contradictory; 22:46 is the likely
  // reading, but it's a guess, and a silent 12-hour error ruins the chart.
  const within = lo <= hi ? hour >= lo && hour <= hi : hour >= lo || hour <= hi
  if (!within) note = 'period_conflict'

  return {
    time: pad(hour, minute),
    accuracy: note ? 'approx' : 'exact',
    note,
  }
}

function pad(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Returns ISO `YYYY-MM-DD`. Assumes day-first, which is universal here. */
export function parseDob(raw: string): string | null {
  const s = gujaratiDigitsToLatin(raw).replace(/[‐‑‒–—―]/g, '-')
  const m = s.match(/(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2,4})/)
  if (!m) return null

  const day = Number(m[1])
  const month = Number(m[2])
  let year = Number(m[3])
  if (year < 100) year += year > 40 ? 1900 : 2000

  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  if (year < 1940 || year > new Date().getFullYear()) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function ageFromDob(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number)
  let age = now.getFullYear() - y
  const beforeBirthday =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)
  if (beforeBirthday) age -= 1
  return age
}

/** Splits `+૯૧ ૯૮…/+૯૧ ૮૪…` into E.164 numbers. Indian default. */
export function parsePhones(raw: string): string[] {
  const s = gujaratiDigitsToLatin(raw)
  const out: string[] = []

  for (const chunk of s.split(/[/,;]| or /i)) {
    const digits = chunk.replace(/\D/g, '')
    if (digits.length === 10 && /^[6-9]/.test(digits)) out.push(`+91${digits}`)
    else if (digits.length === 12 && digits.startsWith('91')) out.push(`+${digits}`)
    else if (digits.length === 11 && digits.startsWith('0')) out.push(`+91${digits.slice(1)}`)
  }

  return [...new Set(out)]
}

export function contactKindFromLabel(line: string): 'father_mobile' | 'mother_mobile' | 'self_mobile' {
  if (/પિતા|father/i.test(line)) return 'father_mobile'
  if (/માતા|mother/i.test(line)) return 'mother_mobile'
  return 'self_mobile'
}

/** Last token of the name, used as the exogamy key. */
export function surnameOf(fullName: string): string | null {
  const parts = fullName.trim().split(/\s+/)
  return parts.length >= 2 ? parts[parts.length - 1] : null
}

/* ------------------------------------------------------------ pipeline */

export type ParsedBiodata = {
  fullNameGu: string | null
  fullNameEn: string | null
  gender: 'male' | 'female' | null
  dob: string | null
  age: number | null
  statedAge: number | null
  birthTime: string | null
  birthTimeAccuracy: 'exact' | 'approx' | 'unknown'
  birthPlaceText: string | null
  heightCm: number | null
  educationDetail: string | null
  occupationDetail: string | null
  fatherName: string | null
  motherName: string | null
  mosalName: string | null
  mosalSurname: string | null
  paternalSurname: string | null
  sectRaw: string | null
  rashiRaw: string | null
  address: string | null
  phones: Array<{ kind: string; value: string }>
  /** Field keys that need a human look before submission. */
  warnings: string[]
}

const GUJARATI_RANGE = /[\u0A80-\u0AFF]/

/** Route the name to the right column instead of dumping every script into
 *  fullNameGu — the two are displayed independently per locale. */
function splitNameByScript(name: string | null): {
  gu: string | null
  en: string | null
} {
  if (!name) return { gu: null, en: null }
  return GUJARATI_RANGE.test(name) ? { gu: name, en: null } : { gu: null, en: name }
}

const SECT_MAP: Record<string, string> = {
  'ભગત': 'bhagat', bhagat: 'bhagat',
  'જગત': 'jagat', jagat: 'jagat',
}

export function parseBiodata(raw: string, now = new Date()): ParsedBiodata {
  const text = normalise(raw)
  const f = extractFields(text)
  const warnings: string[] = []

  const dob = f.dob ? parseDob(f.dob) : null
  if (f.dob && !dob) warnings.push('dob')

  const statedAge = f.age ? Number(gujaratiDigitsToLatin(f.age).replace(/\D/g, '')) || null : null
  const age = dob ? ageFromDob(dob, now) : null

  // A one-year gap is the normal Indian "running age" convention, not an error.
  if (age != null && statedAge != null && Math.abs(age - statedAge) > 1) {
    warnings.push('age')
  }

  const bt = f.birth_time ? parseBirthTime(f.birth_time) : { time: null, accuracy: 'unknown' as const }
  if (bt.note) warnings.push('birth_time')
  if (!bt.time) warnings.push('birth_time')

  const heightCm = f.height ? parseHeightToCm(f.height) : null
  if (f.height && !heightCm) warnings.push('height')

  const phones: Array<{ kind: string; value: string }> = []
  if (f.contact) {
    const contactLine =
      text.split('\n').find((l) => {
        const m = l.match(/^([^:]{1,60}):+/)
        return m ? matchLabel(m[1]) === 'contact' : matchBareLabel(l)?.key === 'contact'
      }) ?? ''
    for (const value of parsePhones(f.contact)) {
      phones.push({ kind: contactKindFromLabel(contactLine), value })
    }
    if (!phones.length) warnings.push('contact')
  }

  const sectRaw = f.sect?.trim() ?? null
  const sect = sectRaw ? SECT_MAP[sectRaw.toLowerCase()] ?? null : null
  if (sectRaw && !sect) warnings.push('sect')

  const mosalName = f.mosal ?? null
  const name = splitNameByScript(f.name ?? null)

  return {
    fullNameGu: name.gu,
    fullNameEn: name.en,
    gender: (f.gender as 'male' | 'female' | undefined) ?? null,
    dob,
    age,
    statedAge,
    birthTime: bt.time,
    birthTimeAccuracy: bt.accuracy,
    birthPlaceText: f.birth_place ?? null,
    heightCm,
    educationDetail: f.education ?? null,
    occupationDetail: f.occupation ?? null,
    fatherName: f.father_name ?? null,
    motherName: f.mother_name ?? null,
    mosalName,
    mosalSurname: mosalName ? surnameOf(mosalName) : null,
    paternalSurname: f.name ? surnameOf(f.name) : null,
    sectRaw: sect ?? sectRaw,
    rashiRaw: f.rashi ?? null,
    address: f.address ?? null,
    phones,
    warnings: [...new Set(warnings)],
  }
}
