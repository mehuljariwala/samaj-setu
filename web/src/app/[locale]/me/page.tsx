import { UserPlus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { TopBar } from '@/components/TopBar'
import { AuthGate } from '@/components/AuthGate'
import { getServerSession } from '@/lib/session'
import { supabaseConfigured } from '@/lib/supabase/env'
import { redirect } from '@/i18n/navigation'

export default async function MinePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Server-side gate. AuthGate is client-side and protects the experience;
  // this protects the route. RLS protects the data.
  if (supabaseConfigured && !(await getServerSession())) {
    redirect({ href: { pathname: '/login', query: { next: '/me' } }, locale })
  }

  const t = await getTranslations('mine')
  const ti = await getTranslations('import')

  return (
    <>
      <TopBar title={t('title')} />
      <main id="main" className="container-app pad-bottom-nav pt-4">
        <AuthGate next="/me">
        <div className="mt-12 flex flex-col items-center px-6 text-center">
          <UserPlus size={44} aria-hidden className="text-fg-subtle" />
          <p className="mt-4 text-lg font-semibold">{t('empty')}</p>
          <Link href="/add" className="btn btn-primary mt-6 w-full max-w-xs">
            {ti('title')}
          </Link>
        </div>
        </AuthGate>
      </main>
    </>
  )
}
