'use client'

import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  PartyPopper,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { Celebrate } from './Celebrate'
import { cn } from '@/lib/cn'
import { localeDigits } from '@/lib/format'
import {
  displayPhone,
  normalisePhone,
  requestOtp,
  saveDisplayName,
  verifyOtp,
  type AuthError,
} from '@/lib/auth'
import { useSession } from '@/lib/useSession'

type Step = 'phone' | 'otp' | 'name' | 'done'

const RESEND_SECONDS = 30

export function LoginFlow({ next = '/add' }: { next?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const { session } = useSession()

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

  /** One place to phrase every GoTrue failure mode in the user's language. */
  function message(err: AuthError): string {
    switch (err) {
      case 'invalid_phone': return t('phoneInvalid')
      case 'invalid_code': return t('otpInvalid')
      case 'provider_disabled': return t('errProviderDisabled')
      case 'rate_limited': return t('errRateLimited')
      case 'not_configured': return t('errNotConfigured')
      default: return t('errUnknown')
    }
  }

  async function submitPhone() {
    const e164 = normalisePhone(phoneInput)
    if (!e164) {
      setError(t('phoneInvalid'))
      return
    }
    setBusy(true)
    setError(null)

    const res = await requestOtp(e164)
    setBusy(false)

    if (!res.ok) {
      setError(message(res.error))
      return
    }
    setPhone(e164)
    setStep('otp')
    setCooldown(RESEND_SECONDS)
  }

  async function submitOtp(value: string) {
    setBusy(true)
    setError(null)

    const res = await verifyOtp(phone, value)
    setBusy(false)

    if (!res.ok) {
      setError(message(res.error))
      setCode('')
      return
    }
    // useSession picks the new session up via onAuthStateChange; a returning
    // member who already has a name skips straight past onboarding.
    setStep('name')
  }

  // Once the session lands, a returning member shouldn't be asked their name
  // again.
  useEffect(() => {
    if (step === 'name' && session?.onboarded) setStep('done')
  }, [step, session])

  async function submitName() {
    setBusy(true)
    const res = await saveDisplayName(name)
    setBusy(false)
    if (!res.ok) {
      setError(message(res.error))
      return
    }
    setStep('done')
  }

  return (
    <div>
      {step === 'phone' && (
        <div className="animate-rise">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Phone size={26} aria-hidden />
          </span>
          <h2 className="display mt-4 text-2xl">{t('welcome')}</h2>
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
            <p id="phone-error" role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-danger">
              <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
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

          <h2 className="display mt-2 text-2xl">{t('otpTitle')}</h2>
          <p className="mt-2 text-fg-muted">{t('otpSentTo', { phone: displayPhone(phone) })}</p>

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
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-medium text-danger">
              <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
              {error}
            </p>
          )}

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
            disabled={cooldown > 0 || busy}
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
          <h2 className="display text-2xl">{t('nameTitle')}</h2>
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

          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submitName}
            disabled={!name.trim() || busy}
            className="btn btn-primary mt-6 w-full"
          >
            {busy && <Loader2 size={20} aria-hidden className="animate-spin" />}
            {t('finish')}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="relative flex flex-col items-center py-8 text-center">
          <Celebrate />

          {/* A verified phone is not yet a browsing member: RLS requires
              status='active', which a moderator grants. Saying so here beats
              an empty browse page with no explanation. */}
          {session && session.status !== 'active' ? (
            <>
              <span className="animate-pop flex size-20 items-center justify-center rounded-full bg-warning-soft text-warning">
                <Clock size={40} aria-hidden />
              </span>
              <h2 className="display animate-rise mt-5 text-2xl" style={{ animationDelay: '120ms' }}>
                {t('pendingTitle')}
              </h2>
              <p className="animate-rise mt-2 max-w-sm text-fg-muted" style={{ animationDelay: '180ms' }}>
                {t('pendingBody')}
              </p>
            </>
          ) : (
            <>
              <span className="animate-pop flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
                <PartyPopper size={40} aria-hidden />
              </span>
              <h2 className="display animate-rise mt-5 text-2xl" style={{ animationDelay: '120ms' }}>
                {t('accountReady')}
              </h2>
              <p className="animate-rise mt-2 max-w-sm text-fg-muted" style={{ animationDelay: '180ms' }}>
                {t('accountReadyBody')}
              </p>
            </>
          )}

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

/** Six boxes rather than one field: each digit stays legible and a mis-typed
 *  one is obvious. OS autofill and paste of a whole code both still work. */
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
    onChange(next.join('').slice(0, 6))
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
