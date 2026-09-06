import { UserPlus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { TopBar } from '@/components/TopBar'

export default async function MinePage() {
  const t = await getTranslations('mine')
  const ti = await getTranslations('import')

  return (
    <>
      <TopBar title={t('title')} />
      <main id="main" className="pad-bottom-nav px-4 pt-4">
        <div className="mt-12 flex flex-col items-center px-6 text-center">
          <UserPlus size={44} aria-hidden className="text-fg-subtle" />
          <p className="mt-4 text-lg font-semibold">{t('empty')}</p>
          <Link href="/import" className="btn btn-primary mt-6 w-full max-w-xs">
            {ti('title')}
          </Link>
        </div>
      </main>
    </>
  )
}
