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
  OptionList,
  SelectField,
  TextAreaField,
  TextField,
} from './form/Fields'
import { ProgressBar, QuestionScreen } from './form/QuestionScreen'
import { cn } from '@/lib/cn'
import { formatHeight, localeDigits } from '@/lib/format'
import {
  EMPTY_FORM,
  STEPS,
  STEP_COUNT,
  clearDraft,
  computedAge,
  loadDraft,
  saveDraft,
  validateStep,
  type FormErrors,
  type ProfileFormData,
  type StepId,
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
  const [step, setStep] = useState<StepId>(STEPS[0])
  const [errors, setErrors] = useState<FormErrors>({})
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  // Skips the focus move on first paint, so landing on the form doesn't yank
  // the viewport past the page heading.
  const mounted = useRef(false)

  const index = STEPS.indexOf(step)
  const isLast = index === STEP_COUNT - 1
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

  // Each screen replaces the last, so focus has to follow or a screen reader
  // stays parked on the previous question.
  //
  // preventScroll matters: letting focus() do the scrolling lands the heading
  // under the sticky TopBar and hides the progress bar, so the family loses
  // both "where am I" and the question itself. Scroll to the top of the flow
  // explicitly instead.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
    headingRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [step])

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
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setErrors({})

    if (isLast) {
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
      setDone(true)
      return
    }

    setStep(STEPS[index + 1])
  }

  function goBack() {
    setErrors({})
    if (index > 0) setStep(STEPS[index - 1])
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

  return (
    <div>
      {/* Progress and Back share a row: on a phone the two things a family
          wants — "how far in am I" and "undo that" — stay side by side. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={index === 0}
          aria-label={t('back')}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-0"
        >
          <ArrowLeft size={22} aria-hidden />
        </button>
        <div className="flex-1">
          <ProgressBar current={index + 1} total={STEP_COUNT} />
        </div>
        <span className="shrink-0 text-sm tabular-nums text-fg-muted">
          {localeDigits(index + 1, locale)} / {localeDigits(STEP_COUNT, locale)}
        </span>
      </div>

      {prefilledSet.size > 0 && index === 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
          <Sparkles size={17} aria-hidden className="mt-0.5 shrink-0" />
          {t('prefilled')}
        </p>
      )}

      <div ref={headingRef} key={step} className="mt-6">
        {renderStep()}
      </div>

      {/* Pinned so the way forward is always in reach without scrolling back. */}
      <div className="safe-bottom sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:mx-0 lg:rounded-b-xl">
        <button
          type="button"
          onClick={goNext}
          disabled={submitting}
          className="btn btn-primary w-full"
        >
          {submitting && <Loader2 size={20} aria-hidden className="animate-spin" />}
          {submitting ? t('submitting') : isLast ? t('submit') : t('next')}
          {!submitting && !isLast && <ArrowRight size={20} aria-hidden />}
        </button>

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

  function renderStep() {
    switch (step) {
      case 'relation':
        return (
          <QuestionScreen question={t('qRelation')} help={t('qRelationHelp')}>
            <OptionList
              id="relation"
              label=""
              value={data.relation}
              onChange={(v) => set('relation', v)}
              error={errors.relation}
              options={[
                { value: 'self', label: t('relationSelf') },
                { value: 'father', label: t('relationFather') },
                { value: 'mother', label: t('relationMother') },
                { value: 'brother', label: t('relationBrother') },
                { value: 'sister', label: t('relationSister') },
                { value: 'relative', label: t('relationRelative') },
              ]}
            />
          </QuestionScreen>
        )

      case 'gender':
        return (
          <QuestionScreen question={t('qGender')} help={t('qGenderHelp')}>
            <OptionList
              id="gender"
              label=""
              value={data.gender}
              onChange={(v) => set('gender', v)}
              error={errors.gender}
              options={[
                { value: 'male', label: t('forSon') },
                { value: 'female', label: t('forDaughter') },
              ]}
            />
          </QuestionScreen>
        )

      case 'name':
        return (
          <QuestionScreen question={t('qName')} help={t('qNameHelp')}>
            <TextField
              id="fullNameGu"
              label={t('nameGu')}
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
          </QuestionScreen>
        )

      case 'dob':
        return (
          <QuestionScreen question={t('qDob')} help={t('qDobHelp')}>
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
          </QuestionScreen>
        )

      case 'birth':
        return (
          <QuestionScreen question={t('qBirth')} help={t('qBirthHelp')}>
            <div>
              <TextField
                id="birthTime"
                type="time"
                label={t('birthTimeLabel')}
                required={!data.birthTimeUnknown}
                value={data.birthTime}
                onChange={(v) => set('birthTime', v)}
                error={errors.birthTime}
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
          </QuestionScreen>
        )

      case 'body':
        return (
          <QuestionScreen question={t('qBody')} help={t('qBodyHelp')}>
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
          </QuestionScreen>
        )

      case 'subCommunity':
        return (
          <QuestionScreen question={t('qSubCommunity')} help={t('qSubCommunityHelp')}>
            <OptionList
              id="subCommunity"
              label=""
              value={data.subCommunity}
              onChange={(v) => set('subCommunity', v)}
              error={errors.subCommunity}
              options={taxonomies.subCommunity}
            />
          </QuestionScreen>
        )

      case 'sect':
        return (
          <QuestionScreen question={t('qSect')} help={t('qSectHelp')}>
            <OptionList
              id="sect"
              label=""
              value={data.sect}
              onChange={(v) => set('sect', v)}
              error={errors.sect}
              options={taxonomies.sect}
            />
          </QuestionScreen>
        )

      case 'education':
        return (
          <QuestionScreen question={t('qEducation')} help={t('qEducationHelp')}>
            <OptionList
              id="educationLevel"
              label=""
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
          </QuestionScreen>
        )

      case 'occupation':
        return (
          <QuestionScreen question={t('qOccupation')} help={t('qOccupationHelp')}>
            <OptionList
              id="occupationType"
              label=""
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
              rows={2}
              value={data.occupationDetail}
              onChange={(v) => set('occupationDetail', v)}
            />
            <TextField
              id="employer"
              label={t('employerLabel')}
              optionalLabel={t('optional')}
              value={data.employer}
              onChange={(v) => set('employer', v)}
            />
          </QuestionScreen>
        )

      case 'place':
        return (
          <QuestionScreen question={t('qPlace')}>
            <TextField
              id="city"
              label={t('cityLabel')}
              required
              value={data.city}
              onChange={(v) => set('city', v)}
              error={errors.city}
              autoComplete="address-level2"
            />
            <ChipChoice
              id="diet"
              label={t('dietLabel')}
              value={data.diet}
              onChange={(v) => set('diet', v)}
              options={taxonomies.diet}
            />
          </QuestionScreen>
        )

      case 'parents':
        return (
          <QuestionScreen question={t('qParents')}>
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
          </QuestionScreen>
        )

      // Its own screen on purpose: a shared mosal disqualifies a match
      // outright, and families skip it as trivia when it sits in a stack.
      case 'mosal':
        return (
          <QuestionScreen question={t('qMosal')} help={t('mosalHelp')}>
            <TextField
              id="mosalName"
              label={t('mosalLabel')}
              required
              value={data.mosalName}
              onChange={(v) => set('mosalName', v)}
              error={errors.mosalName}
            />
          </QuestionScreen>
        )

      case 'familyExtra':
        return (
          <QuestionScreen question={t('qFamilyExtra')} help={t('qFamilyExtraHelp')}>
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
                value={data.sistersCount}
                onChange={(v) => set('sistersCount', v)}
                options={[0, 1, 2, 3, 4, 5].map((n) => ({
                  value: String(n),
                  label: localeDigits(n, locale),
                }))}
              />
            </div>
          </QuestionScreen>
        )

      case 'astro':
        return (
          <QuestionScreen question={t('qAstro')}>
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
          </QuestionScreen>
        )

      case 'contact':
        return (
          <QuestionScreen question={t('qContact')} help={t('qContactHelp')}>
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
          </QuestionScreen>
        )

      case 'review':
        return (
          <QuestionScreen question={t('reviewTitle')} help={t('reviewHelp')}>
            <ReviewGroup title={t('step1')} onEdit={() => setStep('name')} editLabel={t('edit')}
              rows={[
                [tp('name'), data.fullNameGu || data.fullNameEn],
                [t('forWhom'), data.gender === 'male' ? t('forSon') : data.gender === 'female' ? t('forDaughter') : ''],
              ]}
            />
            <ReviewGroup title={t('step2')} onEdit={() => setStep('dob')} editLabel={t('edit')}
              rows={[
                [tp('dob'), data.dob && localeDigits(data.dob.split('-').reverse().join('/'), locale)],
                [tp('birthTime'), data.birthTimeUnknown ? t('dontKnow') : localeDigits(data.birthTime, locale)],
                [tp('birthPlace'), data.birthPlaceText],
                [tp('height'), data.heightCm ? formatHeight(Number(data.heightCm), locale) : ''],
              ]}
            />
            <ReviewGroup title={t('step3')} onEdit={() => setStep('subCommunity')} editLabel={t('edit')}
              rows={[
                [t('subCommunityLabel'), labelOf(taxonomies.subCommunity, data.subCommunity)],
                [t('sectLabel'), labelOf(taxonomies.sect, data.sect)],
                [tp('study'), data.educationDetail || labelOf(taxonomies.educationLevel, data.educationLevel)],
                [tp('occupation'), data.occupationDetail || labelOf(taxonomies.occupationType, data.occupationType)],
                [t('cityLabel'), data.city],
              ]}
            />
            <ReviewGroup title={t('step4')} onEdit={() => setStep('parents')} editLabel={t('edit')}
              rows={[
                [tp('fatherName'), data.fatherName],
                [tp('motherName'), data.motherName],
                [tp('mosal'), data.mosalName],
              ]}
              emphasise={tp('mosal')}
            />
            <ReviewGroup title={t('step5')} onEdit={() => setStep('astro')} editLabel={t('edit')}
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
          </QuestionScreen>
        )
    }
  }
}

function labelOf(options: TaxonomyOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? ''
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
