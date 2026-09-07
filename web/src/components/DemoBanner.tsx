import { Info } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { supabaseConfigured } from '@/lib/supabase/env'

/**
 * Shown only in fixtures/demo mode. It is tied to `supabaseConfigured` rather
 * than an env flag of its own so it cannot outlive the demo: the moment a
 * deployment gets real Supabase credentials, the banner disappears on its own.
 *
 * It is deliberately not dismissible. A family who scrolls past it and then
 * fills in a real biodata would otherwise believe their daughter's details
 * were saved.
 */
export async function DemoBanner() {
  if (supabaseConfigured) return null

  const t = await getTranslations('app')

  return (
    <div role="status" className="bg-accent-soft text-accent">
      <div className="container-app flex items-start gap-3 py-3">
        <Info size={20} aria-hidden className="mt-0.5 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">{t('demoTitle')}</span>
          {' — '}
          {t('demoBody')}
        </p>
      </div>
    </div>
  )
}
