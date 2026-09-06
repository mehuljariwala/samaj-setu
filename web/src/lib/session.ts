import 'server-only'
import { createClient } from './supabase/server'
import { supabaseConfigured } from './supabase/env'
import type { AppSession } from './useSession'

/**
 * Server-side session. Use this for route guards — `AuthGate` is client-side
 * and only protects the experience, not the data.
 */
export async function getServerSession(): Promise<AppSession | null> {
  if (!supabaseConfigured) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('app_users')
    .select('id, phone_e164, display_name, status, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null

  return {
    userId: data.id,
    phone: data.phone_e164,
    displayName: data.display_name,
    status: data.status,
    role: data.role,
    onboarded: Boolean(data.display_name),
  }
}
