'use client'

import { useEffect, useState } from 'react'

const COLOURS = ['#0e5a56', '#8a5a08', '#186a3b', '#d9a544', '#3e9e96']

/**
 * A short burst of confetti on a genuine milestone. Twenty absolutely
 * positioned spans, no canvas and no dependency.
 *
 * It self-unmounts after the animation so nothing keeps painting, and it
 * renders nothing at all under prefers-reduced-motion — celebratory motion is
 * exactly what that setting exists to suppress.
 */
export function Celebrate({ pieces = 20 }: { pieces?: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setShow(true)
    const id = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(id)
  }, [])

  if (!show) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => (
        <span
          key={i}
          className="animate-fall absolute block rounded-[2px]"
          style={{
            left: `${(i * 97) % 100}%`,
            width: i % 3 === 0 ? 7 : 5,
            height: i % 3 === 0 ? 11 : 8,
            background: COLOURS[i % COLOURS.length],
            animationDelay: `${(i % 7) * 90}ms`,
          }}
        />
      ))}
    </div>
  )
}
