'use client'

import { createClient } from './supabase/client'
import { supabaseConfigured } from './supabase/env'

/**
 * Phone-OTP auth against Supabase.
 *
 * Real SMS goes through the Send SMS Hook to MSG91 (see docs/ARCHITECTURE.md),
 * which needs TRAI DLT registration. Until that lands, enable the Phone
 * provider in the dashboard and add test numbers with fixed codes — the flow
 * below works unchanged against those.
 */

export type AuthResult = { ok: true } | { ok: false; error: AuthError }

export type AuthError =
  | 'invalid_phone'
  | 'provider_disabled'
  | 'invalid_code'
  | 'rate_limited'
  | 'not_configured'
  | 'unknown'

export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return null
}

export function displayPhone(e164: string): string {
  const d = e164.replace(/^\+91/, '')
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : e164
}

/** Maps GoTrue's error shapes onto something the UI can phrase in Gujarati. */
function classify(err: { message?: string; code?: string; status?: number }): AuthError {
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()

  if (code === 'phone_provider_disabled' || msg.includes('unsupported phone provider')) {
    return 'provider_disabled'
  }
  if (code === 'otp_expired' || msg.includes('invalid') || msg.includes('expired')) {
    return 'invalid_code'
  }
  if (err.status === 429 || msg.includes('rate limit') || msg.includes('security purposes')) {
    return 'rate_limited'
  }
  return 'unknown'
}

export async function requestOtp(phone: string): Promise<AuthResult> {
  if (!supabaseConfigured) return { ok: false, error: 'not_configured' }

  const e164 = normalisePhone(phone)
  if (!e164) return { ok: false, error: 'invalid_phone' }

  const { error } = await createClient().auth.signInWithOtp({ phone: e164 })
  return error ? { ok: false, error: classify(error) } : { ok: true }
}

export async function verifyOtp(phone: string, token: string): Promise<AuthResult> {
  if (!supabaseConfigured) return { ok: false, error: 'not_configured' }

  const { error } = await createClient().auth.verifyOtp({ phone, token, type: 'sms' })
  return error ? { ok: false, error: classify(error) } : { ok: true }
}

/** Onboarding: the display name lives on app_users, not in auth metadata. */
export async function saveDisplayName(name: string): Promise<AuthResult> {
  if (!supabaseConfigured) return { ok: false, error: 'not_configured' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unknown' }

  const { error } = await supabase
    .from('app_users')
    .update({ display_name: name.trim() })
    .eq('id', user.id)

  return error ? { ok: false, error: 'unknown' } : { ok: true }
}

export async function signOut() {
  if (!supabaseConfigured) return
  await createClient().auth.signOut()
}
