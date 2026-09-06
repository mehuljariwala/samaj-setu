import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

/**
 * Deep warm ground at the end of the page. The reference gets a lot of its
 * "finished product" feel from simply having one — an app that just stops
 * after the last card reads unfinished on a desktop viewport.
 */
export async function Footer() {
  const t = await getTranslations('footer')
  const tApp = await getTranslations('app')
  const tNav = await getTranslations('nav')
  const tForm = await getTranslations('form')

  const quick = [
    { href: '/browse', label: tNav('browse') },
    { href: '/add', label: tForm('titleNew') },
    { href: '/interests', label: tNav('interests') },
  ] as const

  const support = [t('helpCenter'), t('privacyPolicy'), t('terms'), t('safety'), t('report')]

  return (
    <footer className="mt-12 bg-[var(--color-ink)] text-white/80 lg:mt-16">
      <div className="container-app py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="display text-2xl text-white">{tApp('name')}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed">{t('about')}</p>
          </div>

          <nav aria-labelledby="f-quick">
            <h2 id="f-quick" className="font-bold text-white">
              {t('quickLinks')}
            </h2>
            <ul className="mt-3 space-y-1">
              {quick.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="inline-flex min-h-11 items-center text-sm transition-colors duration-150 hover:text-white"
                  >
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-bold text-white">{t('support')}</h2>
            {/* Not links yet — these pages don't exist, and a dead link in a
                footer is worse than a plain label. */}
            <ul className="mt-3 space-y-1 text-sm">
              {support.map((label) => (
                <li key={label} className="flex min-h-9 items-center">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/15 pt-6 text-sm">
          {t('rights', { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  )
}
