const GU_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯']

/** Latin → Gujarati digits. Parents read `૨૮` faster than `28`; the source
 *  biodatas in the WhatsApp group are written this way throughout. */
export function toGujaratiDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => GU_DIGITS[Number(d)])
}

export function localeDigits(input: string | number, locale: string): string {
  return locale === 'gu' ? toGujaratiDigits(input) : String(input)
}

/** Stored in cm, always displayed in feet and inches — nobody in the samaj
 *  states a height in centimetres. */
export function formatHeight(cm: number | null, locale: string): string | null {
  if (!cm) return null
  const totalInches = Math.round(cm / 2.54)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${localeDigits(feet, locale)}'${localeDigits(inches, locale)}"`
}

export function formatAge(years: number | null, locale: string): string | null {
  if (years == null) return null
  return localeDigits(years, locale)
}

export function displayName(
  p: { fullNameGu: string | null; fullNameEn: string | null },
  locale: string,
): string {
  const preferred = locale === 'gu' ? p.fullNameGu : p.fullNameEn
  return preferred ?? p.fullNameEn ?? p.fullNameGu ?? '—'
}

export function subCommunityLabel(
  p: { subCommunityGu: string | null; subCommunityEn: string | null },
  locale: string,
): string | null {
  return (locale === 'gu' ? p.subCommunityGu : p.subCommunityEn) ?? null
}

export function sectLabel(
  p: { sectGu: string | null; sectEn: string | null },
  locale: string,
): string | null {
  return (locale === 'gu' ? p.sectGu : p.sectEn) ?? null
}

const GAN_LABELS: Record<string, { gu: string; en: string }> = {
  dev: { gu: 'દેવ', en: 'Dev' },
  manushya: { gu: 'મનુષ્ય', en: 'Manushya' },
  rakshas: { gu: 'રાક્ષસ', en: 'Rakshas' },
}

const MANGAL_LABELS: Record<string, { gu: string; en: string }> = {
  none: { gu: 'સાદો', en: 'Non-manglik' },
  low: { gu: 'આંશિક મંગળ', en: 'Partial manglik' },
  high: { gu: 'મંગળ', en: 'Manglik' },
  unknown: { gu: 'ખબર નથી', en: 'Unknown' },
}

export function ganLabel(gan: string | null, locale: string): string | null {
  if (!gan) return null
  return GAN_LABELS[gan]?.[locale === 'gu' ? 'gu' : 'en'] ?? gan
}

export function mangalLabel(m: string | null, locale: string): string | null {
  if (!m) return null
  return MANGAL_LABELS[m]?.[locale === 'gu' ? 'gu' : 'en'] ?? m
}

/** Initials for the photo placeholder. Falls back to the Latin name because
 *  Gujarati conjuncts don't reduce to a readable single glyph. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}
