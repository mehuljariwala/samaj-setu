import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('common')
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-3xl font-bold">404</p>
      <Link href="/" className="btn btn-primary mt-6 w-full max-w-xs">
        {t('back')}
      </Link>
    </main>
  )
}
