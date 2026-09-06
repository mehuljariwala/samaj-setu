import { getTranslations } from 'next-intl/server'
import { LoginFlow } from '@/components/LoginFlow'
import { TopBar } from '@/components/TopBar'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const t = await getTranslations('auth')
  const tc = await getTranslations('common')

  return (
    <>
      <TopBar title={t('loginTitle')} back={{ href: '/', label: tc('back') }} />
      <main id="main" className="container-prose py-6">
        <LoginFlow next={next ?? '/add'} />
      </main>
    </>
  )
}
