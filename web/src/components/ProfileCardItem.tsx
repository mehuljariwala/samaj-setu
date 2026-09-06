import { BadgeCheck, GraduationCap, Heart, Lock, MapPin, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import {
  displayName,
  formatAge,
  formatHeight,
  initials,
  localeDigits,
  sectLabel,
  subCommunityLabel,
} from '@/lib/format'
import type { ProfileCard } from '@/lib/types'

/**
 * Card layout follows the reference — portrait, verified badge, then
 * icon-prefixed facts — because that shape scans faster than a wall of chips.
 *
 * One deliberate divergence: the reference shows every face by default. Here
 * photos are locked until the family approves the viewer, so the locked state
 * gets a designed monogram tile rather than looking like a failed image load.
 * That state is the product's whole promise to a daughter's family, so it
 * should look intentional.
 */
export async function ProfileCardItem({
  profile,
  locale,
  index = 0,
}: {
  profile: ProfileCard
  locale: string
  index?: number
}) {
  const t = await getTranslations('profile')
  const tc = await getTranslations('card')

  const name = displayName(profile, locale)
  const age = formatAge(profile.ageYears, locale)
  const height = formatHeight(profile.heightCm, locale)
  const sub = subCommunityLabel(profile, locale)
  const sect = sectLabel(profile, locale)

  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <article className="card card-interactive flex h-full flex-col overflow-hidden">
        <div className="relative">
          <div className="aspect-4/5 w-full bg-surface-2">
            {profile.photoUnlocked && profile.photoKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoKey}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={tc('photoPrivate')}
                className="hero-photo flex size-full flex-col items-center justify-center gap-2"
              >
                <span
                  aria-hidden
                  className="display flex size-16 items-center justify-center rounded-full bg-surface/80 text-2xl text-primary shadow-(--shadow-card)"
                >
                  {initials(profile.fullNameEn ?? name)}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-fg-muted">
                  <Lock size={12} aria-hidden />
                  {tc('photoPrivate')}
                </span>
              </div>
            )}
          </div>

          {/* Every listed profile has passed a moderator, which is exactly the
              reassurance the WhatsApp group could never offer. */}
          <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-xs font-semibold text-primary shadow-(--shadow-card) backdrop-blur">
            <BadgeCheck size={14} aria-hidden />
            {tc('verified')}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <h3 className="truncate text-lg font-bold leading-snug">
            {name}
            {age && <span className="tabular font-semibold text-fg-muted">, {age}</span>}
          </h3>

          {profile.occupationDetail && (
            <p className="mt-0.5 line-clamp-1 text-sm text-fg-muted">{profile.occupationDetail}</p>
          )}

          <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
            {profile.city && (
              <Fact icon={<MapPin size={15} aria-hidden />}>
                {profile.city}
                {height && <span className="tabular"> · {height}</span>}
              </Fact>
            )}
            {profile.educationDetail && (
              <Fact icon={<GraduationCap size={15} aria-hidden />}>
                <span className="line-clamp-1">{profile.educationDetail}</span>
              </Fact>
            )}
            {/* Mosal on the card: it's the first thing that disqualifies a
                match, and finding out three phone calls later wastes everyone's
                time. */}
            {profile.mosalName && (
              <Fact icon={<Users size={15} aria-hidden />}>
                <span className="line-clamp-1">
                  {t('mosal')}: {profile.mosalName}
                </span>
              </Fact>
            )}
          </ul>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {sub && <span className="chip !text-xs">{sub}</span>}
            {sect && <span className="chip chip-accent !text-xs">{sect}</span>}
          </div>

          <div className="mt-4 flex items-center gap-2 pt-1">
            <Link
              href={`/profile/${profile.publicRef}`}
              className="btn btn-primary !min-h-11 flex-1 !text-sm"
            >
              {tc('viewProfile')}
            </Link>
            <button
              type="button"
              aria-label={tc('shortlist')}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-primary"
            >
              <Heart size={18} aria-hidden />
            </button>
          </div>

          <p className="tabular mt-2 text-xs text-fg-subtle">
            {localeDigits(profile.publicRef, locale)}
          </p>
        </div>
      </article>
    </li>
  )
}

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-fg-subtle">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}
