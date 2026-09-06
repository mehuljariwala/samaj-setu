import { ClipboardPaste, Search, ShieldCheck, ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
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
  const counts = await getCounts()

  return (
    <>
      <TopBar title={tApp('name')} subtitle={tApp('tagline')} />

      <main id="main" className="pad-bottom-nav px-4 pt-4">
        <p className="text-lg font-semibold text-primary">{t('greeting')}</p>
        <h2 className="mt-1 text-2xl font-bold">{t('title')}</h2>
        <p className="mt-2 text-fg-muted">{t('subtitle')}</p>

        {/* Two actions, nothing else competing. Each is a full-width card, not
            a button in a row — the two things a visitor can do here are
            genuinely equal in weight, so neither is demoted. */}
        <div className="mt-5 space-y-3">
          <ActionCard
            href="/import"
            icon={<ClipboardPaste size={26} aria-hidden />}
            title={t('addBiodata')}
            hint={t('addBiodataHint')}
            variant="primary"
          />
          <ActionCard
            href="/browse"
            icon={<Search size={26} aria-hidden />}
            title={t('browseProfiles')}
            hint={t('browseProfilesHint')}
          />
        </div>

        <section aria-labelledby="stats" className="card mt-5 p-4">
          <h3 id="stats" className="text-sm font-semibold text-fg-muted">
            {t('statsTitle')}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat value={localeDigits(counts.male, locale)} label={t('boysCount')} />
            <Stat value={localeDigits(counts.female, locale)} label={t('girlsCount')} />
          </div>
        </section>

        {/* The growth pitch, aimed squarely at the families who aren't joining.
            In the source WhatsApp group the admins asked three separate times
            for daughters' biodatas and got none — this card is the answer to
            why they should trust this instead. */}
        <section className="mt-5 rounded-[var(--radius-card)] border border-success/25 bg-success-soft p-4">
          <h3 className="flex items-center gap-2 font-bold text-success">
            <ShieldCheck size={20} aria-hidden className="shrink-0" />
            {t('privacyTitle')}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-success">{t('privacyBody')}</p>
        </section>

        <section aria-labelledby="how" className="mt-6">
          <h3 id="how" className="text-lg font-bold">
            {t('howItWorks')}
          </h3>
          <ol className="mt-3 space-y-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex gap-3">
                <span
                  aria-hidden
                  className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-bold text-primary"
                >
                  {localeDigits(n, locale)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{t(`step${n}Title` as 'step1Title')}</p>
                  <p className="text-sm text-fg-muted">{t(`step${n}Body` as 'step1Body')}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-6 text-center text-sm font-medium text-accent">
          {tApp('free')}
        </p>
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
        primary
          ? 'flex items-center gap-4 rounded-[var(--radius-card)] bg-primary p-4 text-on-primary shadow-[var(--shadow-card)] transition-transform duration-150 active:scale-[0.985]'
          : 'card flex items-center gap-4 p-4 transition-transform duration-150 active:scale-[0.985]'
      }
    >
      <span
        className={
          primary
            ? 'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15'
            : 'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary'
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">{title}</span>
        <span className={primary ? 'block text-sm text-white/85' : 'block text-sm text-fg-muted'}>
          {hint}
        </span>
      </span>
      <ChevronLeft
        size={22}
        aria-hidden
        className={primary ? 'shrink-0 rotate-180 text-white/70' : 'shrink-0 rotate-180 text-fg-subtle'}
      />
    </Link>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-center">
      <p className="tabular text-3xl font-bold text-primary">{value}</p>
      <p className="mt-0.5 text-sm text-fg-muted">{label}</p>
    </div>
  )
}
