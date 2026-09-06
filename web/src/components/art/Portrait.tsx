import { cn } from '@/lib/cn'

/**
 * Flat illustrated portraits.
 *
 * Deliberately illustrations, not stock photography. On a matrimonial site a
 * photorealistic stranger's face reads as a real member — putting fake ones on
 * seed profiles would undermine exactly the trust this product is selling. An
 * illustration is unmistakably decorative.
 *
 * Ten variants (f1–f5, m1–m5); anything unrecognised is hashed onto one, so a
 * name or a public ref can seed a stable portrait.
 */

type Palette = {
  bg: string
  skin: string
  hair: string
  cloth: string
  clothDark: string
  accentColour: string
}

const PALETTES: Palette[] = [
  { bg: '#e4f0ef', skin: '#e8b98f', hair: '#2b1b16', cloth: '#0e5a56', clothDark: '#0a4744', accentColour: '#d9a544' },
  { bg: '#fbf1de', skin: '#d9a172', hair: '#1f1410', cloth: '#8a5a08', clothDark: '#6d4706', accentColour: '#0e5a56' },
  { bg: '#fdf1ea', skin: '#f0c69f', hair: '#3a241c', cloth: '#8c2f39', clothDark: '#6e242c', accentColour: '#d9a544' },
  { bg: '#e3f3e8', skin: '#c98e63', hair: '#241611', cloth: '#186a3b', clothDark: '#12522d', accentColour: '#fbf1de' },
  { bg: '#f6f1ea', skin: '#e5b184', hair: '#2b1b16', cloth: '#3f4f7a', clothDark: '#313e60', accentColour: '#d9a544' },
]

const IDS = ['f1', 'f2', 'f3', 'f4', 'f5', 'm1', 'm2', 'm3', 'm4', 'm5'] as const
export type PortraitId = (typeof IDS)[number]

function resolve(seed: string): { id: PortraitId; palette: Palette } {
  const idx = IDS.indexOf(seed as PortraitId)
  if (idx >= 0) return { id: IDS[idx], palette: PALETTES[idx % PALETTES.length] }

  // Stable hash so the same profile always gets the same face.
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return { id: IDS[h % IDS.length], palette: PALETTES[h % PALETTES.length] }
}

export function Portrait({
  seed,
  gender,
  className,
}: {
  seed: string
  gender?: 'male' | 'female'
  className?: string
}) {
  const { id, palette: p } = resolve(seed)
  const female = gender ? gender === 'female' : id.startsWith('f')
  const variant = Number(id.slice(1))

  return (
    <svg
      viewBox="0 0 200 250"
      className={cn('size-full', className)}
      role="presentation"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="200" height="250" fill={p.bg} />

      {/* Arch behind the figure — a hint of a mandap without literal depiction. */}
      <path d="M100 28c34 0 60 26 60 58v110H40V86c0-32 26-58 60-58z" fill="#fff" opacity="0.5" />
      <circle cx="100" cy="96" r="56" fill="#fff" opacity="0.55" />

      {/* Shoulders */}
      <path
        d={
          female
            ? 'M100 158c-38 0-66 24-72 56-1 6 3 11 9 11h126c6 0 10-5 9-11-6-32-34-56-72-56z'
            : 'M100 158c-36 0-64 24-70 56-1 6 3 11 9 11h122c6 0 10-5 9-11-6-32-34-56-70-56z'
        }
        fill={p.cloth}
      />

      {female ? (
        <>
          {/* Dupatta across one shoulder */}
          <path d="M62 176c14 22 34 34 58 38l-4 11H37c-6 0-10-5-9-11 4-16 16-29 34-38z" fill={p.clothDark} />
          <path d="M62 176c14 22 34 34 58 38" stroke={p.accentColour} strokeWidth="3" fill="none" opacity="0.85" />
          {/* Mangalsutra-ish neckline detail */}
          <path d="M84 162q16 20 32 0" stroke={p.accentColour} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Kurta placket and collar */}
          <path d="M88 160l12 16 12-16 6 4-14 20h-8l-14-20z" fill={p.clothDark} />
          <line x1="100" y1="186" x2="100" y2="222" stroke={p.clothDark} strokeWidth="3" />
          <circle cx="100" cy="196" r="2.6" fill={p.accentColour} />
          <circle cx="100" cy="210" r="2.6" fill={p.accentColour} />
        </>
      )}

      {/* Neck */}
      <rect x="88" y="132" width="24" height="34" rx="11" fill={p.skin} />

      {/* Hair behind the head */}
      {female && (
        <path
          d={
            variant % 2 === 0
              ? 'M56 104c0-30 20-52 44-52s44 22 44 52c0 26-6 44-10 62-2 9-14 8-14-2v-40H80v40c0 10-12 11-14 2-4-18-10-36-10-62z'
              : 'M58 100c0-28 19-50 42-50s42 22 42 50c0 22-4 36-8 48-2 7-12 6-12-1v-34H78v34c0 7-10 8-12 1-4-12-8-26-8-48z'
          }
          fill={p.hair}
        />
      )}

      {/* Head */}
      <ellipse cx="100" cy="104" rx="36" ry="42" fill={p.skin} />

      {/* Ears */}
      <circle cx="64" cy="108" r="7" fill={p.skin} />
      <circle cx="136" cy="108" r="7" fill={p.skin} />

      {/* Hair on top */}
      {female ? (
        <>
          <path d="M64 96c0-24 16-42 36-42s36 18 36 42c-8-14-22-20-36-20s-28 6-36 20z" fill={p.hair} />
          {/* Centre parting */}
          <path d="M100 56v18" stroke={p.bg} strokeWidth="2.5" opacity="0.5" />
          {/* Bun with a flower */}
          <circle cx="100" cy="48" r="13" fill={p.hair} />
          <circle cx="100" cy="41" r="4.5" fill={p.accentColour} />
          <circle cx="90" cy="46" r="3.2" fill={p.accentColour} opacity="0.9" />
          <circle cx="110" cy="46" r="3.2" fill={p.accentColour} opacity="0.9" />
          {/* Bindi */}
          <circle cx="100" cy="84" r="3.4" fill="#8c2f39" />
          {/* Jhumka earrings */}
          <circle cx="64" cy="120" r="4.6" fill={p.accentColour} />
          <circle cx="136" cy="120" r="4.6" fill={p.accentColour} />
        </>
      ) : (
        <>
          <path
            d={
              variant % 2 === 0
                ? 'M62 100c0-25 17-44 38-44s38 19 38 44c-4-16-16-24-38-24S66 84 62 100z'
                : 'M62 98c2-24 18-42 38-42s36 18 38 42c-6-12-14-18-24-14-8 3-14 3-22 0-10-4-24 2-30 14z'
            }
            fill={p.hair}
          />
          {/* Light beard on some variants */}
          {variant % 3 === 0 && (
            <path d="M70 112c2 22 14 36 30 36s28-14 30-36c-6 18-18 26-30 26s-24-8-30-26z" fill={p.hair} opacity="0.55" />
          )}
        </>
      )}

      {/* Eyes and mouth — a calm, closed-lip smile */}
      <ellipse cx="86" cy="104" rx="3.6" ry="4.4" fill="#2b1b16" />
      <ellipse cx="114" cy="104" rx="3.6" ry="4.4" fill="#2b1b16" />
      <path d="M78 95q8-5 16-1" stroke="#2b1b16" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M106 94q8-4 16 1" stroke="#2b1b16" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M90 122q10 8 20 0" stroke="#8c2f39" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}
