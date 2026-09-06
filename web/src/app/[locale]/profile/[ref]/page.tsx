import { Heart, Info, Lock, Share2, Flag, TriangleAlert } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/TopBar'
import { getProfileByRef } from '@/lib/data'
import {
  displayName,
  formatAge,
  formatHeight,
  ganLabel,
  initials,
  localeDigits,
  mangalLabel,
  sectLabel,
  subCommunityLabel,
} from '@/lib/format'
import type { ProfileCard } from '@/lib/types'

const RASHI_GU: Record<string, string> = {
  mesh: 'મેષ', vrishabh: 'વૃષભ', mithun: 'મિથુન', kark: 'કર્ક',
  simha: 'સિંહ', kanya: 'કન્યા', tula: 'તુલા', vrishchik: 'વૃશ્ચિક',
  dhanu: 'ધનુ', makar: 'મકર', kumbh: 'કુંભ', meen: 'મીન',
}
const RASHI_EN: Record<string, string> = {
  mesh: 'Aries', vrishabh: 'Taurus', mithun: 'Gemini', kark: 'Cancer',
  simha: 'Leo', kanya: 'Virgo', tula: 'Libra', vrishchik: 'Scorpio',
  dhanu: 'Sagittarius', makar: 'Capricorn', kumbh: 'Aquarius', meen: 'Pisces',
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; ref: string }>
}) {
  const { locale, ref } = await params

  const profile = await getProfileByRef(ref)
  if (!profile) notFound()

  const t = await getTranslations('profile')
  const tCommon = await getTranslations('common')
  const tBrowse = await getTranslations('browse')

  const name = displayName(profile, locale)
  const sub = subCommunityLabel(profile, locale)
  const sect = sectLabel(profile, locale)
  const rashi = profile.rashi
    ? (locale === 'gu' ? RASHI_GU : RASHI_EN)[profile.rashi] ?? profile.rashi
    : null

  const maritalKey = (
    { never_married: 'neverMarried', divorced: 'divorced', widowed: 'widowed' } as const
  )[profile.maritalStatus]

  return (
    <>
      <TopBar
        title={name}
        subtitle={localeDigits(profile.publicRef, locale)}
        back={{ href: '/browse', label: tCommon('back') }}
      />

      <main
        id="main"
        className="container-app pt-4 lg:pb-12"
        style={{ paddingBottom: 'calc(92px + env(safe-area-inset-bottom))' }}
      >
        <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-6">
        <div className="lg:sticky lg:top-24">
        <section className="card flex gap-4 p-4 lg:flex-col lg:items-start">
          <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
            {profile.photoUnlocked && profile.photoKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoKey} alt="" className="size-full object-cover" width={96} height={96} />
            ) : (
              <div
                className="flex size-full flex-col items-center justify-center gap-1.5 text-fg-subtle"
                role="img"
                aria-label={t('photoLocked')}
              >
                <span aria-hidden className="text-2xl font-bold">
                  {initials(profile.fullNameEn ?? name)}
                </span>
                <Lock size={16} aria-hidden />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-snug">{name}</h2>
            <p className="tabular mt-1 text-fg-muted">
              {[
                formatAge(profile.ageYears, locale) &&
                  `${formatAge(profile.ageYears, locale)} ${tBrowse('years')}`,
                formatHeight(profile.heightCm, locale),
                profile.city,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sub && <span className="chip">{sub}</span>}
              {sect && <span className="chip chip-accent">{sect}</span>}
              <span className="chip">{tCommon(maritalKey)}</span>
            </div>
          </div>
        </section>

        {!profile.photoUnlocked && (
          <button type="button" className="btn btn-secondary mt-3 w-full">
            <Lock size={18} aria-hidden />
            {t('requestPhoto')}
          </button>
        )}

        {/* On desktop the primary action lives in the rail; the fixed mobile
            bar below is hidden there so it doesn't float over a wide page. */}
        <div className="mt-3 hidden gap-3 lg:flex">
          <button type="button" className="btn btn-secondary !px-4" aria-label={t('shareCard')}>
            <Share2 size={20} aria-hidden />
          </button>
          <button type="button" className="btn btn-primary flex-1">
            <Heart size={20} aria-hidden />
            {t('sendInterest')}
          </button>
        </div>
        </div>

        <div className="min-w-0">
        <Section title={t('personal')}>
          <Row label={t('dob')} value={profile.dob ? localeDigits(formatDate(profile.dob), locale) : null} t={t} />
          <Row label={t('birthTime')} value={profile.birthTime ? localeDigits(profile.birthTime, locale) : null} t={t} />
          <Row label={t('birthPlace')} value={profile.birthPlaceText} t={t} />
          <Row label={t('height')} value={formatHeight(profile.heightCm, locale)} t={t} />
        </Section>

        <Section title={t('educationWork')}>
          <Row label={t('study')} value={profile.educationDetail} t={t} />
          <Row label={t('occupation')} value={profile.occupationDetail} t={t} />
        </Section>

        <Section title={t('family')}>
          <Row label={t('fatherName')} value={profile.fatherName} t={t} />
          <Row label={t('motherName')} value={profile.motherName} t={t} />
          {/* Mosal gets emphasis: it's the field that decides whether a
              conversation can happen at all. */}
          <Row label={t('mosal')} value={profile.mosalName} t={t} emphasis />
          <Row label={t('nativePlace')} value={profile.nativePlace} t={t} />
        </Section>

        <Section title={t('astro')}>
          <Row label={t('rashi')} value={rashi} t={t} />
          <Row label={t('gan')} value={ganLabel(profile.gan, locale)} t={t} />
          <Row label={t('mangal')} value={mangalLabel(profile.mangal, locale)} t={t} />

          {(profile.astroConfidence === 'low' || profile.astroConfidence === 'none') && (
            <p className="mt-3 flex gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              <span>
                {locale === 'gu'
                  ? 'જન્મ સમય ચોક્કસ ન હોવાથી આ ગણતરી પૂરી ભરોસાપાત્ર નથી.'
                  : "Birth time is uncertain, so this calculation isn't fully reliable."}
              </span>
            </p>
          )}

          <p className="mt-3 flex gap-2 text-xs leading-relaxed text-fg-subtle">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
            <span>{t('astroDisclaimer')}</span>
          </p>
        </Section>

        {/* The privacy promise, made visible at exactly the moment it matters. */}
        <Section title={t('contact')}>
          <div className="flex gap-3 rounded-xl bg-surface-2 p-4">
            <Lock size={20} aria-hidden className="mt-0.5 shrink-0 text-fg-muted" />
            <div>
              <p className="font-semibold">{t('contactLocked')}</p>
              <p className="mt-0.5 text-sm text-fg-muted">{t('contactLockedHint')}</p>
            </div>
          </div>
        </Section>

        <button
          type="button"
          className="mt-6 flex w-full min-h-12 items-center justify-center gap-2 text-sm font-medium text-fg-subtle"
        >
          <Flag size={16} aria-hidden />
          {t('report')}
        </button>
        </div>
        </div>
      </main>

      {/* One primary action per screen. Share is secondary and icon-plus-label. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg gap-3 px-4 py-3">
          <button type="button" className="btn btn-secondary !px-4" aria-label={t('shareCard')}>
            <Share2 size={20} aria-hidden />
          </button>
          <button type="button" className="btn btn-primary flex-1">
            <Heart size={20} aria-hidden />
            {t('sendInterest')}
          </button>
        </div>
      </div>
    </>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mt-4 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-fg-muted">{title}</h3>
      <dl className="mt-2 divide-y divide-border">{children}</dl>
    </section>
  )
}

function Row({
  label,
  value,
  t,
  emphasis,
}: {
  label: string
  value: string | null | undefined
  t: (k: 'notProvided') => string
  emphasis?: boolean
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <dt className="w-32 shrink-0 text-sm text-fg-muted">{label}</dt>
      <dd
        className={
          value
            ? emphasis
              ? 'min-w-0 flex-1 font-semibold text-primary'
              : 'min-w-0 flex-1'
            : 'min-w-0 flex-1 text-fg-subtle'
        }
      >
        {value || t('notProvided')}
      </dd>
    </div>
  )
}

export type { ProfileCard }
