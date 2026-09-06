import { BadgeCheck, GraduationCap, Heart, Lock, MapPin, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Portrait } from './art/Portrait'
import { Link } from '@/i18n/navigation'
import {
  displayName,
  formatAge,
  formatHeight,
  localeDigits,
  sectLabel,
  subCommunityLabel,
} from '@/lib/format'
import type { ProfileCard } from '@/lib/types'

/**
 * Sized to sit two-up on a 360px phone, so a parent can compare without
 * scrolling a full screen per profile. Below `sm` the card drops to its
 * essentials — portrait, name, age, city; the fuller facts return once there's
 * room for them.
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

  const released = profile.photoUnlocked && profile.photoKey

  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <article className="card card-interactive flex h-full flex-col overflow-hidden">
        <div className="relative">
          {/* Square on phones so two cards fit without the photo eating the
              viewport; taller portrait crop once there's width to spare. */}
          <div className="aspect-square w-full overflow-hidden bg-surface-2 sm:aspect-4/5">
            <Portrait
              seed={released ? profile.photoKey! : profile.publicRef}
              gender={profile.gender}
              className={released ? undefined : 'scale-110 blur-md'}
            />
          </div>

          {!released && (
            <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-xs font-medium text-fg-muted shadow-(--shadow-card) backdrop-blur">
              <Lock size={11} aria-hidden />
              {tc('photoPrivate')}
            </span>
          )}

          {/* Every listed profile has passed a moderator — the reassurance the
              WhatsApp group could never offer. */}
          <span className="absolute end-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-xs font-semibold text-primary shadow-(--shadow-card) backdrop-blur">
            <BadgeCheck size={13} aria-hidden />
            <span className="hidden sm:inline">{tc('verified')}</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          <h3 className="truncate font-bold leading-snug sm:text-lg">
            {name}
            {age && <span className="tabular font-semibold text-fg-muted">, {age}</span>}
          </h3>

          {profile.occupationDetail && (
            <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted sm:text-sm">
              {profile.occupationDetail}
            </p>
          )}

          <ul className="mt-2 space-y-1 text-xs text-fg-muted sm:mt-3 sm:space-y-1.5 sm:text-sm">
            {profile.city && (
              <Fact icon={<MapPin size={14} aria-hidden />}>
                {profile.city}
                {height && <span className="tabular"> · {height}</span>}
              </Fact>
            )}
            {profile.educationDetail && (
              <Fact icon={<GraduationCap size={14} aria-hidden />} hideOnPhone>
                <span className="line-clamp-1">{profile.educationDetail}</span>
              </Fact>
            )}
            {/* Mosal on the card: it's the first thing that disqualifies a
                match, so surfacing it saves both families a phone call. */}
            {profile.mosalName && (
              <Fact icon={<Users size={14} aria-hidden />} hideOnPhone>
                <span className="line-clamp-1">
                  {t('mosal')}: {profile.mosalName}
                </span>
              </Fact>
            )}
          </ul>

          <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
            {sub && <span className="chip !text-xs">{sub}</span>}
            {sect && <span className="chip chip-accent !text-xs">{sect}</span>}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-3">
            <Link
              href={`/profile/${profile.publicRef}`}
              className="btn btn-primary !min-h-10 min-w-0 flex-1 !px-2 !text-xs sm:!min-h-11 sm:!px-4 sm:!text-sm"
            >
              <span className="truncate">{tc('viewProfile')}</span>
            </Link>
            <button
              type="button"
              aria-label={tc('shortlist')}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-primary sm:size-11"
            >
              <Heart size={17} aria-hidden />
            </button>
          </div>
        </div>
      </article>
    </li>
  )
}

function Fact({
  icon,
  children,
  hideOnPhone,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  hideOnPhone?: boolean
}) {
  return (
    <li className={`min-w-0 items-start gap-1.5 ${hideOnPhone ? 'hidden sm:flex' : 'flex'}`}>
      <span className="mt-0.5 shrink-0 text-fg-subtle">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  )
}

export function ProfileRefLine({ publicRef, locale }: { publicRef: string; locale: string }) {
  return <p className="tabular text-xs text-fg-subtle">{localeDigits(publicRef, locale)}</p>
}
