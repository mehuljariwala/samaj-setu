import { getTranslations } from 'next-intl/server'
import { AddProfileFlow } from '@/components/AddProfileFlow'
import { AuthGate } from '@/components/AuthGate'
import { TopBar } from '@/components/TopBar'
import { getTaxonomy } from '@/lib/data'

export default async function AddProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('form')
  const tc = await getTranslations('common')

  const [subCommunity, sect, diet, educationLevel, occupationType] = await Promise.all([
    getTaxonomy('sub_community', locale),
    getTaxonomy('sect', locale),
    getTaxonomy('diet', locale),
    getTaxonomy('education_level', locale),
    getTaxonomy('occupation_type', locale),
  ])

  const toOptions = (rows: Array<{ code: string; label: string }>) =>
    rows.map((r) => ({ value: r.code, label: r.label }))

  return (
    <>
      <TopBar title={t('titleNew')} back={{ href: '/', label: tc('back') }} />
      {/* Narrow measure: a form read left-to-right across 1100px is unusable. */}
      <main id="main" className="container-prose py-5">
        <AuthGate next="/add">
          <AddProfileFlow
            taxonomies={{
              subCommunity: toOptions(subCommunity),
              sect: toOptions(sect),
              diet: toOptions(diet),
              educationLevel: toOptions(educationLevel),
              occupationType: toOptions(occupationType),
            }}
          />
        </AuthGate>
      </main>
    </>
  )
}
