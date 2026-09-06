import { Portrait } from './Portrait'

/**
 * Hero composition: two illustrated portraits under a soft arch, with marigold
 * dots standing in for a torana. Same reasoning as Portrait — illustration
 * rather than stock photography, so nobody reads the hero as real members.
 *
 * Swap this component out for an <Image> once licensed photography exists.
 */
export function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      {/* Torana of marigolds along the top */}
      <div className="pointer-events-none absolute -top-1 inset-x-6 z-10 flex justify-between">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="animate-rise block rounded-full bg-accent/70"
            style={{
              width: i % 2 ? 9 : 13,
              height: i % 2 ? 9 : 13,
              marginTop: i % 2 ? 10 : 0,
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>

      <div className="relative flex items-end justify-center gap-3 pt-6">
        <div className="animate-rise w-[46%] overflow-hidden rounded-[1.75rem] border-4 border-surface shadow-(--shadow-card-hover)">
          <div className="aspect-4/5">
            <Portrait seed="f3" gender="female" />
          </div>
        </div>

        <div
          className="animate-rise w-[46%] -translate-y-5 overflow-hidden rounded-[1.75rem] border-4 border-surface shadow-(--shadow-card-hover)"
          style={{ animationDelay: '120ms' }}
        >
          <div className="aspect-4/5">
            <Portrait seed="m2" gender="male" />
          </div>
        </div>
      </div>

      {/* Grounding blush ellipse so the pair doesn't float */}
      <div className="mx-auto -mt-4 h-6 w-3/4 rounded-[50%] bg-accent/12 blur-md" />
    </div>
  )
}
