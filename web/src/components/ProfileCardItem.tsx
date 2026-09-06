import { Lock, MapPin } from 'lucide-react'
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
 * One row in the browse list. Optimised for the scan a parent actually
 * performs: name → age/height → mosal. Mosal is on the card because it's the
 * first thing that disqualifies a match, and finding out three phone calls
 * later wastes everyone's time.
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
  const name = displayName(profile, locale)
  const height = formatHeight(profile.heightCm, locale)
  const age = formatAge(profile.ageYears, locale)
  const sub = subCommunityLabel(profile, locale)
  const sect = sectLabel(profile, locale)

  const meta = [
    age && `${age} ${locale === 'gu' ? 'વર્ષ' : 'yrs'}`,
    height,
  ].filter(Boolean)

  return (
    <li
      className="animate-rise"
      // Staggered entrance, capped so a long list never feels slow.
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <Link
        href={`/profile/${profile.publicRef}`}
        className="card flex gap-3 p-3 transition-colors duration-150 active:bg-surface-2"
      >
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {profile.photoUnlocked && profile.photoKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoKey}
              alt=""
              className="size-full object-cover"
              loading="lazy"
              width={80}
              height={80}
            />
          ) : (
            <div
              className="flex size-full flex-col items-center justify-center gap-1 text-fg-subtle"
              role="img"
              aria-label={t('photoLocked')}
            >
              <span aria-hidden className="text-lg font-bold">
                {initials(profile.fullNameEn ?? name)}
              </span>
              <Lock size={14} aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold leading-snug">{name}</p>

          <p className="tabular mt-0.5 text-sm text-fg-muted">
            {meta.join(' · ')}
            {profile.city && (
              <span className="ml-1 inline-flex items-center gap-0.5">
                <MapPin size={13} aria-hidden className="inline shrink-0" />
                {profile.city}
              </span>
            )}
          </p>

          {profile.occupationDetail && (
            <p className="mt-1 line-clamp-1 text-sm text-fg-muted">
              {profile.occupationDetail}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {sub && <span className="chip">{sub}</span>}
            {sect && <span className="chip chip-accent">{sect}</span>}
          </div>

          {profile.mosalName && (
            <p className="mt-1.5 truncate text-xs text-fg-subtle">
              {t('mosal')}: {profile.mosalName}
            </p>
          )}

          <p className="tabular mt-1 text-xs text-fg-subtle">
            {localeDigits(profile.publicRef, locale)}
          </p>
        </div>
      </Link>
    </li>
  )
}
