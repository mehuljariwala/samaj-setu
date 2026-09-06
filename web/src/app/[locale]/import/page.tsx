import { getTranslations } from 'next-intl/server'
import { ImportFlow } from '@/components/ImportFlow'
import { TopBar } from '@/components/TopBar'

export default async function ImportPage() {
  const t = await getTranslations('import')
  const tc = await getTranslations('common')

  return (
    <>
      <TopBar title={t('title')} back={{ href: '/', label: tc('back') }} />
      <main id="main" className="px-4 pt-4">
        <ImportFlow />
      </main>
    </>
  )
}
