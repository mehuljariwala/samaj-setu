import { HeartHandshake } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { TopBar } from '@/components/TopBar'

export default async function InterestsPage() {
  const t = await getTranslations('interests')
  const tb = await getTranslations('browse')

  return (
    <>
      <TopBar title={t('title')} />
      <main id="main" className="pad-bottom-nav px-4 pt-4">
        <div className="mt-12 flex flex-col items-center px-6 text-center">
          <HeartHandshake size={44} aria-hidden className="text-fg-subtle" />
          <p className="mt-4 text-lg font-semibold">{t('empty')}</p>
          <p className="mt-1 text-sm text-fg-muted">{t('emptyHint')}</p>
          <Link href="/browse" className="btn btn-primary mt-6 w-full max-w-xs">
            {tb('title')}
          </Link>
        </div>
      </main>
    </>
  )
}
