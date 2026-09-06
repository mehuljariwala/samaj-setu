import {
  ChevronRight,
  ClipboardPaste,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { GettingStarted } from '@/components/GettingStarted'
import { TopBar } from '@/components/TopBar'
import { getCounts } from '@/lib/data'
import { localeDigits } from '@/lib/format'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const t = await getTranslations('home')
  const tApp = await getTranslations('app')
  const tForm = await getTranslations('form')
  const counts = await getCounts()

  return (
    <>
      <TopBar title={tApp('name')} subtitle={tApp('tagline')} />

      <main id="main" className="pad-bottom-nav">
        {/* Warm band behind the hero. A soft tint rather than a photograph: it
            costs nothing on a 3G connection and never fights the text. */}
        <section className="border-b border-border bg-gradient-to-b from-primary-soft via-accent-soft/40 to-bg">
          <div className="container-app py-8 lg:py-14">
            <div className="lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
              <div>
                <span className="chip chip-accent">
                  <Sparkles size={14} aria-hidden />
                  {tApp('free')}
                </span>

                <p className="mt-4 text-lg font-semibold text-primary">{t('greeting')}</p>
                <h2 className="mt-1 text-2xl font-bold lg:text-4xl">{t('title')}</h2>
                <p className="mt-3 max-w-prose text-fg-muted lg:text-lg">{t('subtitle')}</p>

                <div className="mt-6 space-y-3 sm:flex sm:space-y-0 sm:gap-3">
                  <ActionCard
                    href="/add"
                    icon={<ClipboardPaste size={24} aria-hidden />}
                    title={t('addBiodata')}
                    hint={t('addBiodataHint')}
                    variant="primary"
                  />
                  <ActionCard
                    href="/browse"
                    icon={<Search size={24} aria-hidden />}
                    title={t('browseProfiles')}
                    hint={t('browseProfilesHint')}
                  />
                </div>
              </div>

              {/* Community proof plus the journey, so the next action is
                  visible without scrolling on desktop. */}
              <div className="mt-8 space-y-4 lg:mt-0">
                <div className="card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
                    <UsersRound size={17} aria-hidden />
                    {t('statsTitle')}
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Stat value={localeDigits(counts.male, locale)} label={t('boysCount')} />
                    <Stat value={localeDigits(counts.female, locale)} label={t('girlsCount')} />
                  </div>
                  <Link href="/add" className="btn btn-secondary mt-4 w-full !min-h-12 !text-sm">
                    {tForm('titleNew')}
                    <ChevronRight size={17} aria-hidden />
                  </Link>
                </div>

                <GettingStarted />
              </div>
            </div>
          </div>
        </section>

        <div className="container-app py-8 lg:py-12">
          {/* The growth pitch, aimed at the families who aren't joining. In the
              source WhatsApp group the admins asked three times for daughters'
              biodatas and got none — this is the answer to why trust this. */}
          <section className="rounded-[var(--radius-card)] border border-success/20 bg-success-soft p-5 lg:p-6">
            <div className="lg:flex lg:items-start lg:gap-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                <ShieldCheck size={26} aria-hidden />
              </span>
              <div className="mt-3 lg:mt-0">
                <h3 className="text-lg font-bold text-success">{t('privacyTitle')}</h3>
                <p className="mt-1.5 max-w-prose leading-relaxed text-success">
                  {t('privacyBody')}
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="how" className="mt-10">
            <h3 id="how" className="text-xl font-bold lg:text-2xl">
              {t('howItWorks')}
            </h3>

            <ol className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-6">
              {[
                { n: 1, Icon: ClipboardPaste },
                { n: 2, Icon: Search },
                { n: 3, Icon: HeartHandshake },
              ].map(({ n, Icon }) => (
                <li key={n} className="card flex gap-4 p-5 lg:flex-col lg:gap-3">
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
                  >
                    <Icon size={24} />
                  </span>
                  <div className="min-w-0">
                    <p className="tabular text-xs font-bold uppercase tracking-wider text-fg-subtle">
                      {localeDigits(n, locale)}
                    </p>
                    <p className="mt-0.5 font-bold">{t(`step${n}Title` as 'step1Title')}</p>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                      {t(`step${n}Body` as 'step1Body')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </>
  )
}

function ActionCard({
  href,
  icon,
  title,
  hint,
  variant,
}: {
  href: string
  icon: React.ReactNode
  title: string
  hint: string
  variant?: 'primary'
}) {
  const primary = variant === 'primary'
  return (
    <Link
      href={href}
      className={
        (primary
          ? 'bg-primary text-on-primary shadow-(--shadow-card) '
          : 'card card-interactive ') +
        'flex flex-1 items-center gap-4 rounded-[var(--radius-card)] p-4 transition-transform duration-150 active:scale-[0.985]'
      }
    >
      <span
        className={
          primary
            ? 'flex size-13 shrink-0 items-center justify-center rounded-xl bg-white/15'
            : 'flex size-13 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary'
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className={primary ? 'block text-sm text-white/85' : 'block text-sm text-fg-muted'}>
          {hint}
        </span>
      </span>
      <ChevronRight
        size={20}
        aria-hidden
        className={primary ? 'shrink-0 text-white/70' : 'shrink-0 text-fg-subtle'}
      />
    </Link>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-4 text-center">
      <p className="tabular text-3xl font-bold text-primary">{value}</p>
      <p className="mt-0.5 text-sm text-fg-muted">{label}</p>
    </div>
  )
}
