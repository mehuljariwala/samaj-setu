'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { submitProfile } from '@/lib/actions'
import {
  CheckboxField,
  ChipChoice,
  ChoiceCards,
  SelectField,
  TextAreaField,
  TextField,
} from './form/Fields'
import { cn } from '@/lib/cn'
import { formatHeight, localeDigits } from '@/lib/format'
import {
  EMPTY_FORM,
  STEP_COUNT,
  clearDraft,
  computedAge,
  loadDraft,
  saveDraft,
  validateStep,
  type FormErrors,
  type ProfileFormData,
} from '@/lib/profileForm'

export type TaxonomyOption = { value: string; label: string }

export type FormTaxonomies = {
  subCommunity: TaxonomyOption[]
  sect: TaxonomyOption[]
  diet: TaxonomyOption[]
  educationLevel: TaxonomyOption[]
  occupationType: TaxonomyOption[]
}

const HEIGHTS = Array.from({ length: 31 }, (_, i) => 140 + i * 2)

const RASHIS = [
  ['mesh', 'મેષ', 'Aries'], ['vrishabh', 'વૃષભ', 'Taurus'], ['mithun', 'મિથુન', 'Gemini'],
  ['kark', 'કર્ક', 'Cancer'], ['simha', 'સિંહ', 'Leo'], ['kanya', 'કન્યા', 'Virgo'],
  ['tula', 'તુલા', 'Libra'], ['vrishchik', 'વૃશ્ચિક', 'Scorpio'], ['dhanu', 'ધનુ', 'Sagittarius'],
  ['makar', 'મકર', 'Capricorn'], ['kumbh', 'કુંભ', 'Aquarius'], ['meen', 'મીન', 'Pisces'],
] as const

export function ProfileForm({
  initial,
  prefilled,
  taxonomies,
  importJobId,
}: {
  initial?: ProfileFormData
  prefilled?: string[]
  taxonomies: FormTaxonomies
  importJobId?: string
}) {
  const t = useTranslations('form')
  const tp = useTranslations('profile')
  const tc = useTranslations('common')
  const ti = useTranslations('import')
  const locale = useLocale()

  const [data, setData] = useState<ProfileFormData>(initial ?? EMPTY_FORM)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<FormErrors>({})
  const [done, setDone] = useState(false)
  const [publicRef, setPublicRef] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const prefilledSet = new Set(prefilled ?? [])

  // Restore an interrupted session, but never over a paste-seeded form.
  useEffect(() => {
    if (initial) return
    const draft = loadDraft()
    if (draft) {
      setData(draft.d)
      setStep(draft.step)
    }
  }, [initial])

  useEffect(() => {
    if (!done) saveDraft(data, step)
  }, [data, step, done])

  function set<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setData((d) => ({ ...d, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const errMsg = { required: t('errorRequired'), consent: t('consentRequired') }

  /** Server errors come back as keys so they can be phrased in Gujarati. */
  function submitErrorMessage(key: string): string {
    switch (key) {
      case 'demo_mode': return t('errDemo')
      case 'not_active': return t('errNotActive')
      case 'not_allowed': return t('errNotAllowed')
      case 'duplicate': return t('errDuplicate')
      case 'mosal_required': return t('errMosal')
      case 'consent_required': return t('errConsent')
      default: return t('errUnknown')
    }
  }

  async function goNext() {
    const found = validateStep(step, data, errMsg)
    if (Object.keys(found).length) {
      setErrors(found)
      // Move focus to the first thing that's wrong rather than leaving the
      // user to hunt for the red text.
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setErrors({})

    if (step === STEP_COUNT) {
      setSubmitting(true)
      setSubmitError(null)

      const res = await submitProfile(data, importJobId)
      setSubmitting(false)

      if (!res.ok) {
        // The draft is deliberately NOT cleared on failure — twenty answers
        // must survive a network blip.
        setSubmitError(submitErrorMessage(res.error))
        return
      }

      clearDraft()
      setPublicRef(res.data.publicRef)
      setDone(true)
      return
    }

    setStep((s) => s + 1)
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  function goBack() {
    setErrors({})
    setStep((s) => Math.max(1, s - 1))
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  if (done) {
    return (
      <div className="animate-rise flex flex-col items-center py-12 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 size={44} aria-hidden className="text-success" />
        </span>
        <h2 className="mt-5 text-2xl font-bold">{ti('submittedTitle')}</h2>
        <p className="mt-2 max-w-md text-fg-muted">{ti('submittedBody')}</p>
        <Link href="/browse" className="btn btn-primary mt-7 w-full max-w-xs">
          {tc('next')}
        </Link>
      </div>
    )
  }

  const stepLabels = [t('step1'), t('step2'), t('step3'), t('step4'), t('step5'), t('step6')]

  return (
    <div ref={topRef}>
      <Stepper current={step} labels={stepLabels} onJump={(s) => s < step && setStep(s)} />

      <p className="mt-3 text-sm text-fg-muted">
        {t('stepOf', {
          current: localeDigits(step, locale),
          total: localeDigits(STEP_COUNT, locale),
        })}
        {' · '}
        <span className="font-medium text-fg">{stepLabels[step - 1]}</span>
      </p>

      {prefilledSet.size > 0 && step === 1 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
          <Sparkles size={17} aria-hidden className="mt-0.5 shrink-0" />
          {t('prefilled')}
        </p>
      )}

      <div key={step} className="animate-rise mt-5 space-y-5">
        {step === 1 && (
          <>
            <ChoiceCards
              id="relation"
              label={t('relation')}
              required
              value={data.relation}
              onChange={(v) => set('relation', v)}
              error={errors.relation}
              columns={3}
              options={[
                { value: 'self', label: t('relationSelf') },
                { value: 'father', label: t('relationFather') },
                { value: 'mother', label: t('relationMother') },
                { value: 'brother', label: t('relationBrother') },
                { value: 'sister', label: t('relationSister') },
                { value: 'relative', label: t('relationRelative') },
              ]}
            />

            <ChoiceCards
              id="gender"
              label={t('forWhom')}
              required
              value={data.gender}
              onChange={(v) => set('gender', v)}
              error={errors.gender}
              options={[
                { value: 'male', label: t('forSon') },
                { value: 'female', label: t('forDaughter') },
              ]}
            />

            <TextField
              id="fullNameGu"
              label={t('nameGu')}
              hint={t('nameHelp')}
              required
              value={data.fullNameGu}
              onChange={(v) => set('fullNameGu', v)}
              error={errors.fullNameGu}
              autoComplete="name"
            />

            <TextField
              id="fullNameEn"
              label={t('nameEn')}
              optionalLabel={t('optional')}
              value={data.fullNameEn}
              onChange={(v) => set('fullNameEn', v)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <TextField
              id="dob"
              type="date"
              label={t('dobLabel')}
              required
              value={data.dob}
              onChange={(v) => set('dob', v)}
              error={errors.dob}
              hint={
                computedAge(data.dob) != null
                  ? t('ageComputed', { age: localeDigits(computedAge(data.dob)!, locale) })
                  : undefined
              }
            />

            <div>
              <TextField
                id="birthTime"
                type="time"
                label={t('birthTimeLabel')}
                required={!data.birthTimeUnknown}
                value={data.birthTime}
                onChange={(v) => set('birthTime', v)}
                error={errors.birthTime}
                hint={t('birthTimeHelp')}
              />
              <div className="mt-2">
                <CheckboxField
                  id="birthTimeUnknown"
                  checked={data.birthTimeUnknown}
                  onChange={(v) => {
                    set('birthTimeUnknown', v)
                    if (v) set('birthTime', '')
                  }}
                  label={t('birthTimeUnknown')}
                />
              </div>
            </div>

            <TextField
              id="birthPlaceText"
              label={t('birthPlaceLabel')}
              placeholder={t('birthPlacePlaceholder')}
              optionalLabel={t('optional')}
              value={data.birthPlaceText}
              onChange={(v) => set('birthPlaceText', v)}
            />

            <SelectField
              id="heightCm"
              label={t('heightLabel')}
              required
              value={data.heightCm}
              onChange={(v) => set('heightCm', v)}
              error={errors.heightCm}
              options={HEIGHTS.map((cm) => ({
                value: String(cm),
                label: `${formatHeight(cm, locale)} (${localeDigits(cm, locale)} cm)`,
              }))}
            />

            <ChipChoice
              id="maritalStatus"
              label={t('maritalLabel')}
              value={data.maritalStatus}
              onChange={(v) => set('maritalStatus', v)}
              options={[
                { value: 'never_married', label: tc('neverMarried') },
                { value: 'divorced', label: tc('divorced') },
                { value: 'widowed', label: tc('widowed') },
              ]}
            />
          </>
        )}

        {step === 3 && (
          <>
            <ChipChoice
              id="subCommunity"
              label={t('subCommunityLabel')}
              required
              value={data.subCommunity}
              onChange={(v) => set('subCommunity', v)}
              error={errors.subCommunity}
              options={taxonomies.subCommunity}
            />

            <ChipChoice
              id="sect"
              label={t('sectLabel')}
              required
              value={data.sect}
              onChange={(v) => set('sect', v)}
              error={errors.sect}
              options={taxonomies.sect}
            />

            <ChipChoice
              id="diet"
              label={t('dietLabel')}
              value={data.diet}
              onChange={(v) => set('diet', v)}
              options={taxonomies.diet}
            />

            <SelectField
              id="educationLevel"
              label={t('educationLevelLabel')}
              required
              value={data.educationLevel}
              onChange={(v) => set('educationLevel', v)}
              error={errors.educationLevel}
              options={taxonomies.educationLevel}
            />

            <TextField
              id="educationDetail"
              label={t('educationDetailLabel')}
              placeholder={t('educationDetailPlaceholder')}
              optionalLabel={t('optional')}
              value={data.educationDetail}
              onChange={(v) => set('educationDetail', v)}
            />

            <ChipChoice
              id="occupationType"
              label={t('occupationTypeLabel')}
              required
              value={data.occupationType}
              onChange={(v) => set('occupationType', v)}
              error={errors.occupationType}
              options={taxonomies.occupationType}
            />

            <TextAreaField
              id="occupationDetail"
              label={t('occupationDetailLabel')}
              placeholder={t('occupationDetailPlaceholder')}
              optionalLabel={t('optional')}
              value={data.occupationDetail}
              onChange={(v) => set('occupationDetail', v)}
            />

            <TextField
              id="city"
              label={t('cityLabel')}
              required
              value={data.city}
              onChange={(v) => set('city', v)}
              error={errors.city}
              autoComplete="address-level2"
            />
          </>
        )}

        {step === 4 && (
          <>
            <TextField
              id="fatherName"
              label={t('fatherNameLabel')}
              required
              value={data.fatherName}
              onChange={(v) => set('fatherName', v)}
              error={errors.fatherName}
            />
            <TextField
              id="motherName"
              label={t('motherNameLabel')}
              required
              value={data.motherName}
              onChange={(v) => set('motherName', v)}
              error={errors.motherName}
            />
            {/* Required, and the reason why is stated inline — families will
                otherwise skip it as trivia. */}
            <TextField
              id="mosalName"
              label={t('mosalLabel')}
              hint={t('mosalHelp')}
              required
              value={data.mosalName}
              onChange={(v) => set('mosalName', v)}
              error={errors.mosalName}
            />
            <TextField
              id="nativePlace"
              label={t('nativePlaceLabel')}
              optionalLabel={t('optional')}
              value={data.nativePlace}
              onChange={(v) => set('nativePlace', v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                id="brothersCount"
                label={t('brothersLabel')}
                optionalLabel={t('optional')}
                value={data.brothersCount}
                onChange={(v) => set('brothersCount', v)}
                options={[0, 1, 2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: localeDigits(n, locale),
                }))}
              />
              <SelectField
                id="sistersCount"
                label={t('sistersLabel')}
                optionalLabel={t('optional')}
                value={data.sistersCount}
                onChange={(v) => set('sistersCount', v)}
                options={[0, 1, 2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: localeDigits(n, locale),
                }))}
              />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-sm text-primary">
              <Info size={17} aria-hidden className="mt-0.5 shrink-0" />
              {t('astroHelp')}
            </p>

            <SelectField
              id="rashi"
              label={t('rashiLabel')}
              optionalLabel={t('dontKnow')}
              value={data.rashi}
              onChange={(v) => set('rashi', v)}
              options={RASHIS.map(([code, gu, en]) => ({
                value: code,
                label: locale === 'gu' ? gu : en,
              }))}
            />

            <ChipChoice
              id="gan"
              label={t('ganLabel')}
              value={data.gan}
              onChange={(v) => set('gan', v)}
              options={[
                { value: 'dev', label: locale === 'gu' ? 'દેવ' : 'Dev' },
                { value: 'manushya', label: locale === 'gu' ? 'મનુષ્ય' : 'Manushya' },
                { value: 'rakshas', label: locale === 'gu' ? 'રાક્ષસ' : 'Rakshas' },
              ]}
            />

            <ChipChoice
              id="mangal"
              label={t('mangalLabel')}
              value={data.mangal}
              onChange={(v) => set('mangal', v)}
              options={[
                { value: 'none', label: locale === 'gu' ? 'સાદો' : 'Non-manglik' },
                { value: 'low', label: locale === 'gu' ? 'આંશિક' : 'Partial' },
                { value: 'high', label: locale === 'gu' ? 'મંગળ' : 'Manglik' },
              ]}
            />

            <PhoneList
              phones={data.phones}
              onChange={(p) => set('phones', p)}
              error={errors.phones}
              labels={{
                label: t('phoneLabel'),
                hint: t('phoneHelp'),
                add: t('addPhone'),
                remove: t('removePhone'),
                father: t('phoneKindFather'),
                mother: t('phoneKindMother'),
                self: t('phoneKindSelf'),
              }}
            />

            <TextAreaField
              id="address"
              label={t('addressLabel')}
              hint={t('addressHelp')}
              optionalLabel={t('optional')}
              value={data.address}
              onChange={(v) => set('address', v)}
            />
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="text-xl font-bold">{t('reviewTitle')}</h2>
            <p className="-mt-3 text-sm text-fg-muted">{t('reviewHelp')}</p>

            <ReviewGroup title={stepLabels[0]} onEdit={() => setStep(1)} editLabel={t('edit')}
              rows={[
                [tp('name'), data.fullNameGu || data.fullNameEn],
                [t('forWhom'), data.gender === 'male' ? t('forSon') : data.gender === 'female' ? t('forDaughter') : ''],
              ]}
            />
            <ReviewGroup title={stepLabels[1]} onEdit={() => setStep(2)} editLabel={t('edit')}
              rows={[
                [tp('dob'), data.dob && localeDigits(data.dob.split('-').reverse().join('/'), locale)],
                [tp('birthTime'), data.birthTimeUnknown ? t('dontKnow') : localeDigits(data.birthTime, locale)],
                [tp('birthPlace'), data.birthPlaceText],
                [tp('height'), data.heightCm ? formatHeight(Number(data.heightCm), locale) : ''],
              ]}
            />
            <ReviewGroup title={stepLabels[2]} onEdit={() => setStep(3)} editLabel={t('edit')}
              rows={[
                [t('subCommunityLabel'), labelOf(taxonomies.subCommunity, data.subCommunity)],
                [t('sectLabel'), labelOf(taxonomies.sect, data.sect)],
                [tp('study'), data.educationDetail || labelOf(taxonomies.educationLevel, data.educationLevel)],
                [tp('occupation'), data.occupationDetail || labelOf(taxonomies.occupationType, data.occupationType)],
                [t('cityLabel'), data.city],
              ]}
            />
            <ReviewGroup title={stepLabels[3]} onEdit={() => setStep(4)} editLabel={t('edit')}
              rows={[
                [tp('fatherName'), data.fatherName],
                [tp('motherName'), data.motherName],
                [tp('mosal'), data.mosalName],
              ]}
              emphasise={tp('mosal')}
            />
            <ReviewGroup title={stepLabels[4]} onEdit={() => setStep(5)} editLabel={t('edit')}
              rows={[
                [tp('rashi'), data.rashi ? (locale === 'gu' ? RASHIS.find((r) => r[0] === data.rashi)?.[1] : RASHIS.find((r) => r[0] === data.rashi)?.[2]) ?? '' : ''],
                [tp('contact'), data.phones.filter((p) => p.value).map((p) => p.value).join(', ')],
              ]}
            />

            <div className="space-y-2 pt-1">
              <CheckboxField
                id="consentListing"
                checked={data.consentListing}
                onChange={(v) => set('consentListing', v)}
                label={t('consentListing')}
              />
              <CheckboxField
                id="candidateConfirmed"
                checked={data.candidateConfirmed}
                onChange={(v) => set('candidateConfirmed', v)}
                label={t('consentCandidate')}
              />
              {errors.consentListing && (
                <p role="alert" className="text-sm font-medium text-danger">
                  {errors.consentListing}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Pinned so the way forward is always in reach without scrolling back. */}
      <div className="safe-bottom sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:mx-0 lg:rounded-b-xl">
        <div className="flex gap-3">
          {step > 1 && (
            <button type="button" onClick={goBack} className="btn btn-secondary !px-4" aria-label={t('back')}>
              <ArrowLeft size={20} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="btn btn-primary flex-1"
          >
            {submitting && <Loader2 size={20} aria-hidden className="animate-spin" />}
            {submitting ? t('submitting') : step === STEP_COUNT ? t('submit') : t('next')}
            {!submitting && step < STEP_COUNT && <ArrowRight size={20} aria-hidden />}
          </button>
        </div>

        {submitError && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-danger">
            <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
            {submitError}
          </p>
        )}

        <p className="mt-1.5 text-center text-xs text-fg-subtle">{t('draftSaved')}</p>
      </div>
    </div>
  )
}

function labelOf(options: TaxonomyOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? ''
}

function Stepper({
  current,
  labels,
  onJump,
}: {
  current: number
  labels: string[]
  onJump: (step: number) => void
}) {
  return (
    <ol className="flex gap-1.5" aria-label={labels[current - 1]}>
      {labels.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'current' : 'todo'
        return (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => onJump(n)}
              disabled={state === 'todo'}
              aria-current={state === 'current' ? 'step' : undefined}
              aria-label={label}
              className={cn(
                'flex h-1.5 w-full rounded-full transition-colors duration-200',
                state === 'done' && 'bg-primary',
                state === 'current' && 'bg-primary',
                state === 'todo' && 'bg-border',
                state === 'done' && 'cursor-pointer',
              )}
            />
          </li>
        )
      })}
    </ol>
  )
}

function ReviewGroup({
  title,
  rows,
  onEdit,
  editLabel,
  emphasise,
}: {
  title: string
  rows: Array<[string, string | null | undefined]>
  onEdit: () => void
  editLabel: string
  emphasise?: string
}) {
  return (
    <section className="card p-4">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-sm font-bold uppercase tracking-wide text-fg-muted">{title}</h3>
        <button type="button" onClick={onEdit} className="btn btn-ghost !min-h-10 !px-3 !text-sm">
          {editLabel}
        </button>
      </div>
      <dl className="mt-1 divide-y divide-border">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-3 py-2">
              <dt className="w-28 shrink-0 text-sm text-fg-muted">{k}</dt>
              <dd className={cn('min-w-0 flex-1', emphasise === k && 'font-semibold text-primary')}>
                {v}
              </dd>
            </div>
          ))}
      </dl>
    </section>
  )
}

function PhoneList({
  phones,
  onChange,
  error,
  labels,
}: {
  phones: Array<{ kind: string; value: string }>
  onChange: (p: Array<{ kind: string; value: string }>) => void
  error?: string
  labels: Record<'label' | 'hint' | 'add' | 'remove' | 'father' | 'mother' | 'self', string>
}) {
  const kinds = [
    { value: 'father_mobile', label: labels.father },
    { value: 'mother_mobile', label: labels.mother },
    { value: 'self_mobile', label: labels.self },
  ]

  return (
    <fieldset>
      <legend className="field-label">
        {labels.label}
        <span className="text-danger" aria-hidden>
          {' '}
          *
        </span>
      </legend>

      <div className="space-y-2">
        {phones.map((p, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={p.kind}
              onChange={(e) => {
                const next = [...phones]
                next[i] = { ...next[i], kind: e.target.value }
                onChange(next)
              }}
              aria-label={labels.label}
              className="field-input w-32 shrink-0 !px-2"
            >
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>

            <input
              type="tel"
              // inputMode + type=tel gets the numeric keypad on Android,
              // which matters more than validation here.
              inputMode="tel"
              autoComplete="tel"
              value={p.value}
              onChange={(e) => {
                const next = [...phones]
                next[i] = { ...next[i], value: e.target.value }
                onChange(next)
              }}
              placeholder="98765 43210"
              aria-invalid={Boolean(error)}
              className="field-input min-w-0 flex-1"
            />

            {phones.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(phones.filter((_, j) => j !== i))}
                aria-label={labels.remove}
                className="flex size-13 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors duration-150 hover:bg-surface-2"
              >
                <X size={18} aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      {phones.length < 3 && (
        <button
          type="button"
          onClick={() => onChange([...phones, { kind: 'mother_mobile', value: '' }])}
          className="btn btn-ghost mt-2 !min-h-11 !px-3 !text-sm"
        >
          <Plus size={17} aria-hidden />
          {labels.add}
        </button>
      )}

      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-success">
          <Check size={15} aria-hidden className="mt-1 shrink-0" />
          {labels.hint}
        </p>
      )}
    </fieldset>
  )
}
