'use client'

/**
 * Session handling.
 *
 * This is a STAND-IN, not the real thing: it keeps the session in
 * localStorage and accepts a fixed demo OTP, so the whole journey is walkable
 * before Supabase is provisioned.
 *
 * Every function below maps 1:1 onto a Supabase Auth call, so switching over
 * is a change to this file alone:
 *   requestOtp → supabase.auth.signInWithOtp({ phone })
 *   verifyOtp  → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 *   getSession → supabase.auth.getSession()
 *   signOut    → supabase.auth.signOut()
 *
 * Real SMS goes through the Send SMS Hook to MSG91 — see docs/ARCHITECTURE.md.
 * TRAI DLT registration is a prerequisite and has a lead time.
 */

export const DEMO_OTP = '123456'

export type Session = {
  phone: string
  name: string
  onboarded: boolean
  verifiedAt: number
}

const KEY = 'samaj-setu:session'

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

export async function requestOtp(phone: string): Promise<{ ok: boolean }> {
  await delay(600)
  return { ok: Boolean(normalisePhone(phone)) }
}

export async function verifyOtp(phone: string, code: string): Promise<Session | null> {
  await delay(700)
  if (code !== DEMO_OTP) return null

  const existing = getSession()
  const session: Session = {
    phone,
    name: existing?.phone === phone ? existing.name : '',
    onboarded: existing?.phone === phone ? existing.onboarded : false,
    verifiedAt: Date.now(),
  }
  setSession(session)
  return session
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function setSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    window.dispatchEvent(new Event('samaj-session'))
  } catch {
    /* private browsing */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
    window.dispatchEvent(new Event('samaj-session'))
  } catch {
    /* no-op */
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
