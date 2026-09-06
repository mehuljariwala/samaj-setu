import {
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { GettingStarted } from '@/components/GettingStarted'
import { HeroSearch } from '@/components/HeroSearch'
import { ProfileCardItem } from '@/components/ProfileCardItem'
import { TopBar } from '@/components/TopBar'
import { getCities, getCounts, getProfiles, getTaxonomy } from '@/lib/data'
import { localeDigits } from '@/lib/format'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const t = await getTranslations('home')
  const tApp = await getTranslations('app')

  const [counts, subCommunities, sects, cities, girls, boys] = await Promise.all([
    getCounts(),
    getTaxonomy('sub_community', locale),
    getTaxonomy('sect', locale),
    getCities(),
    getProfiles({ gender: 'female' }),
    getProfiles({ gender: 'male' }),
  ])

  // Interleave so the strip never reads as one gender's noticeboard.
  const recent = [girls[0], boys[0], girls[1], boys[1]].filter(Boolean).slice(0, 4)
  const total = counts.male + counts.female

  return (
    <>
      <TopBar title={tApp('name')} subtitle={tApp('tagline')} />

      <main id="main" className="pad-bottom-nav">
        {/* ---------------------------------------------------------- hero */}
        <section className="relative overflow-hidden">
          {/* Photo slot. Ships as a warm gradient so the page is never broken;
              drop a licensed image at /public/hero.jpg and set the background
              on this element to swap it in. */}
          <div aria-hidden className="hero-photo absolute inset-0" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-bg via-bg/92 to-bg/45 lg:to-transparent"
          />

          <div className="container-app relative py-10 lg:py-20">
            <div className="max-w-2xl">
              <span className="chip chip-accent">
                <Sparkles size={14} aria-hidden />
                {tApp('free')}
              </span>

              <p className="mt-5 text-lg font-semibold text-primary">{t('greeting')}</p>
              <h2 className="display mt-2 text-3xl lg:text-5xl">
                {t('title')}
                <span className="mt-1 block text-primary">{t('heroAccent')}</span>
              </h2>
              <p className="mt-4 max-w-prose text-fg-muted lg:text-lg">{t('subtitle')}</p>

              {/* Trust row, lifted from the reference — but with real numbers.
                  Inflating a member count is the fastest way to lose a samaj. */}
              <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-4">
                <Trust
                  icon={<UsersRound size={18} aria-hidden />}
                  value={localeDigits(total, locale)}
                  label={t('trustMembersLabel')}
                />
                <Trust
                  icon={<BadgeCheck size={18} aria-hidden />}
                  value={t('trustVerifiedValue')}
                  label={t('trustVerifiedLabel')}
                />
                <Trust
                  icon={<ShieldCheck size={18} aria-hidden />}
                  value={t('trustPrivacyValue')}
                  label={t('trustPrivacyLabel')}
                />
              </ul>
            </div>

            {/* Straddles the hero's lower edge, as in the reference. */}
            <div className="mt-9 lg:mt-14">
              <HeroSearch subCommunities={subCommunities.map(toOpt)} sects={sects.map(toOpt)} cities={cities} />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- story */}
        <section className="bg-surface">
          <div className="container-app py-12 lg:py-20">
            <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
              {/* Overlapping pair, borrowed from the reference. Both are
                  decorative gradient panels until real photography exists —
                  stock faces on a community site would undercut the point. */}
              <div className="relative hidden aspect-4/3 lg:block">
                <div className="hero-photo absolute inset-y-4 start-0 w-3/4 rounded-2xl" />
                <div className="hero-photo animate-drift absolute inset-y-0 end-0 w-3/5 rounded-2xl border-4 border-surface shadow-(--shadow-card-hover)" />
              </div>

              <div>
                <h2 className="display text-2xl lg:text-4xl">
                  {t('storyTitle')}
                  <span className="mt-1 block text-primary">{t('storyAccent')}</span>
                </h2>
                <p className="mt-5 max-w-prose leading-relaxed text-fg-muted">{t('storyBody1')}</p>
                <p className="mt-3 max-w-prose leading-relaxed text-fg-muted">{t('storyBody2')}</p>

                <Link href="/add" className="btn btn-primary mt-7">
                  {t('storyCta')}
                  <ArrowRight size={20} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ recent strip */}
        {recent.length > 0 && (
          <section className="container-app py-12 lg:py-16">
            <div className="text-center">
              <h2 className="display text-2xl lg:text-4xl">{t('recentTitle')}</h2>
              <p className="mt-2 text-fg-muted">{t('recentSubtitle')}</p>
            </div>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((p, i) => (
                <ProfileCardItem key={p.id} profile={p} locale={locale} index={i} />
              ))}
            </ul>

            <div className="mt-8 text-center">
              <Link href="/browse" className="btn btn-secondary">
                {t('viewAll')}
                <ArrowRight size={19} aria-hidden />
              </Link>
            </div>
          </section>
        )}

        {/* --------------------------------------- privacy + next steps */}
        <section className="bg-[var(--color-blush)]">
          <div className="container-app py-12 lg:py-16">
            <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
              <div className="rounded-[var(--radius-card)] border border-success/20 bg-success-soft p-5 lg:p-7">
                <span className="flex size-12 items-center justify-center rounded-xl bg-success/10 text-success">
                  <ShieldCheck size={26} aria-hidden />
                </span>
                <h2 className="display mt-4 text-xl text-success lg:text-2xl">
                  {t('privacyTitle')}
                </h2>
                <p className="mt-2 max-w-prose leading-relaxed text-success">{t('privacyBody')}</p>
              </div>

              <div className="mt-6 lg:mt-0">
                <GettingStarted />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ how it works */}
        <section className="container-app py-12 lg:py-16">
          <h2 className="display text-center text-2xl lg:text-4xl">{t('howItWorks')}</h2>

          <ol className="stagger mt-8 grid gap-4 lg:grid-cols-3 lg:gap-6">
            {[
              { n: 1, Icon: Sparkles },
              { n: 2, Icon: UsersRound },
              { n: 3, Icon: HeartHandshake },
            ].map(({ n, Icon }) => (
              <li key={n} className="card p-6 text-center">
                <span
                  aria-hidden
                  className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                >
                  <Icon size={26} />
                </span>
                <p className="tabular mt-4 text-xs font-bold uppercase tracking-wider text-fg-subtle">
                  {localeDigits(n, locale)}
                </p>
                <p className="mt-1 text-lg font-bold">{t(`step${n}Title` as 'step1Title')}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {t(`step${n}Body` as 'step1Body')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  )
}

function toOpt(r: { code: string; label: string }) {
  return { value: r.code, label: r.label }
}

function Trust({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        {icon}
      </span>
      <span>
        <span className="tabular block text-lg font-bold leading-tight">{value}</span>
        <span className="block text-sm text-fg-muted">{label}</span>
      </span>
    </li>
  )
}
