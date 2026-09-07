import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Gujarati, Noto_Serif_Gujarati } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { DemoBanner } from '@/components/DemoBanner'
import { Footer } from '@/components/Footer'
import { SideNav } from '@/components/SideNav'
import { routing } from '@/i18n/routing'
import '../globals.css'

/**
 * One family for both scripts. Noto Sans Gujarati covers Latin too, which
 * matters because mixed-script lines are the norm in this data — biodatas say
 * things like "ICICI Bank માં વેલ્યુએશન ઓફિસર". Pairing two fonts would make
 * every such line visibly mismatched mid-sentence.
 */
const noto = Noto_Sans_Gujarati({
  subsets: ['gujarati', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-gujarati',
})

/**
 * Serif for display headings only. An all-sans page reads like a government
 * form; a serif headline is what makes the reference designs feel warm. Using
 * the Noto *serif* sibling keeps Gujarati and Latin metrically consistent, so
 * mixed-script headings don't fracture mid-line.
 */
const notoSerif = Noto_Serif_Gujarati({
  subsets: ['gujarati', 'latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-serif-gujarati',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'app' })
  return {
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('tagline'),
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: t('name') },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never lock zoom — a presbyopic user pinching to read is the whole point.
  maximumScale: 5,
  // Single value: the app is light-only, so offering a dark theme-color would
  // tint the Android browser chrome against a light page.
  themeColor: '#fafaf8',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  return (
    <html lang={locale} className={`${noto.variable} ${notoSerif.variable}`}>
      <body className={`${noto.className} min-h-dvh`}>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
          >
            Skip to content
          </a>
          <div className="lg:flex">
            <SideNav />
            <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
              <DemoBanner />
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
          </div>
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
