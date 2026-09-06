'use client'

import { ArrowLeft, ArrowRight, Loader2, PartyPopper, Phone, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { Celebrate } from './Celebrate'
import { cn } from '@/lib/cn'
import { localeDigits } from '@/lib/format'
import {
  DEMO_OTP,
  displayPhone,
  getSession,
  normalisePhone,
  requestOtp,
  setSession,
  verifyOtp,
} from '@/lib/auth'

type Step = 'phone' | 'otp' | 'name' | 'done'

const RESEND_SECONDS = 30

export function LoginFlow({ next = '/add' }: { next?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()

  const [step, setStep] = useState<Step>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function submitPhone() {
    const e164 = normalisePhone(phoneInput)
    if (!e164) {
      setError(t('phoneInvalid'))
      return
    }
    setBusy(true)
    setError(null)
    await requestOtp(e164)
    setPhone(e164)
    setStep('otp')
    setCooldown(RESEND_SECONDS)
    setBusy(false)
  }

  async function submitOtp(value: string) {
    setBusy(true)
    setError(null)
    const session = await verifyOtp(phone, value)
    setBusy(false)

    if (!session) {
      setError(t('otpInvalid'))
      setCode('')
      return
    }
    // Returning users skip straight past the name step.
    if (session.onboarded && session.name) {
      setStep('done')
      return
    }
    setStep('name')
  }

  function submitName() {
    const existing = getSession()
    if (!existing) return
    setSession({ ...existing, name: name.trim(), onboarded: true })
    setStep('done')
  }

  return (
    <div>
      {step === 'phone' && (
        <div className="animate-rise">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Phone size={26} aria-hidden />
          </span>
          <h2 className="mt-4 text-2xl font-bold">{t('welcome')}</h2>
          <p className="mt-2 text-fg-muted">{t('welcomeBody')}</p>

          <label htmlFor="phone" className="field-label mt-6">
            {t('phoneLabel')}
          </label>
          <div className="flex gap-2">
            <span className="flex min-h-13 shrink-0 items-center rounded-lg border-1.5 border-border-strong bg-surface-2 px-3 font-medium text-fg-muted">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value.replace(/\D/g, ''))
                if (error) setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
              placeholder="98765 43210"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'phone-error' : 'phone-hint'}
              className="field-input tabular flex-1 text-lg tracking-wide"
            />
          </div>

          {error ? (
            <p id="phone-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
              <TriangleAlert size={15} aria-hidden />
              {error}
            </p>
          ) : (
            <p id="phone-hint" className="mt-2 flex items-center gap-1.5 text-sm text-fg-muted">
              <ShieldCheck size={15} aria-hidden className="shrink-0 text-success" />
              {t('phoneHint')}
            </p>
          )}

          <button
            type="button"
            onClick={submitPhone}
            disabled={busy || phoneInput.length < 10}
            className="btn btn-primary mt-6 w-full"
          >
            {busy && <Loader2 size={20} aria-hidden className="animate-spin" />}
            {busy ? t('sending') : t('sendOtp')}
            {!busy && <ArrowRight size={20} aria-hidden />}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="animate-in-right">
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setCode('')
              setError(null)
            }}
            className="btn btn-ghost -ml-3 !min-h-11 !px-3 !text-sm"
          >
            <ArrowLeft size={18} aria-hidden />
            {t('changeNumber')}
          </button>

          <h2 className="mt-2 text-2xl font-bold">{t('otpTitle')}</h2>
          <p className="mt-2 text-fg-muted">
            {t('otpSentTo', { phone: displayPhone(phone) })}
          </p>

          <div className="mt-6">
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v)
                if (error) setError(null)
                if (v.length === 6) submitOtp(v)
              }}
              invalid={Boolean(error)}
              disabled={busy}
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm font-medium text-danger">
              <TriangleAlert size={15} aria-hidden />
              {error}
            </p>
          )}

          {/* The demo has no SMS provider wired up, so the code is shown here
              rather than leaving the flow impossible to complete. */}
          <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {t('demoHint', { code: DEMO_OTP })}
          </p>

          <button
            type="button"
            onClick={() => submitOtp(code)}
            disabled={busy || code.length < 6}
            className="btn btn-primary mt-5 w-full"
          >
            {busy && <Loader2 size={20} aria-hidden className="animate-spin" />}
            {busy ? t('verifying') : t('verify')}
          </button>

          <button
            type="button"
            disabled={cooldown > 0}
            onClick={async () => {
              await requestOtp(phone)
              setCooldown(RESEND_SECONDS)
            }}
            className="btn btn-ghost mt-2 w-full !text-sm"
          >
            {cooldown > 0
              ? t('resendIn', { seconds: localeDigits(cooldown, locale) })
              : t('resend')}
          </button>
        </div>
      )}

      {step === 'name' && (
        <div className="animate-in-right">
          <h2 className="text-2xl font-bold">{t('nameTitle')}</h2>
          <p className="mt-2 text-fg-muted">{t('nameBody')}</p>

          <label htmlFor="name" className="field-label mt-6">
            {t('nameLabel')}
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && submitName()}
            dir="auto"
            autoComplete="name"
            className="field-input"
          />

          <button
            type="button"
            onClick={submitName}
            disabled={!name.trim()}
            className="btn btn-primary mt-6 w-full"
          >
            {t('finish')}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="relative flex flex-col items-center py-8 text-center">
          <Celebrate />
          <span className="animate-pop flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
            <PartyPopper size={40} aria-hidden />
          </span>
          <h2 className="animate-rise mt-5 text-2xl font-bold" style={{ animationDelay: '120ms' }}>
            {t('accountReady')}
          </h2>
          <p className="animate-rise mt-2 max-w-sm text-fg-muted" style={{ animationDelay: '180ms' }}>
            {t('accountReadyBody')}
          </p>
          <button
            type="button"
            onClick={() => router.replace(next as '/add')}
            className="btn btn-primary animate-rise mt-7 w-full max-w-xs"
            style={{ animationDelay: '240ms' }}
          >
            {t('startBiodata')}
            <ArrowRight size={20} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

/** Six boxes rather than one field: the digits stay individually legible, and
 *  a mis-typed one is obvious at a glance. Paste of a full code still works. */
function OtpInput({
  value,
  onChange,
  invalid,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  disabled?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function setDigit(index: number, digit: string) {
    const next = value.split('')
    next[index] = digit
    const joined = next.join('').slice(0, 6)
    onChange(joined)
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="OTP">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ''}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '')
            if (d.length > 1) {
              onChange(d.slice(0, 6)) // OS autofill drops the whole code in
              return
            }
            setDigit(i, d)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6))
          }}
          className={cn(
            'tabular h-15 w-full rounded-xl border-2 bg-surface text-center text-2xl font-bold transition-colors duration-150',
            invalid ? 'border-danger' : value[i] ? 'border-primary' : 'border-border-strong',
          )}
        />
      ))}
    </div>
  )
}
