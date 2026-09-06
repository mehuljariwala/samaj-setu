'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { supabaseConfigured } from './supabase/env'
import type { ProfileFormData } from './profileForm'

/**
 * Every mutation in the app. Server actions rather than client-side inserts,
 * so the anon key is never used to write and each call has one place to log,
 * validate and revalidate.
 *
 * Authorisation is NOT enforced here — it lives in RLS and the guard triggers.
 * These are a convenience layer, not the boundary.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const DEMO: ActionResult<never> = {
  ok: false,
  error: 'demo_mode',
}

/** Maps Postgres error codes onto keys the UI can translate. */
function toError(err: { code?: string; message?: string } | null): string {
  if (!err) return 'unknown'
  if (err.code === '42501') return 'not_allowed'
  if (err.code === '23505') return 'duplicate'
  if (err.code === '23514') return 'invalid'
  if (err.message?.includes('membership is not active')) return 'not_active'
  if (err.message?.includes('add your own biodata')) return 'need_own_profile'
  if (err.message?.includes('consent')) return 'consent_required'
  if (err.message?.includes('mosal')) return 'mosal_required'
  return 'unknown'
}

/* ------------------------------------------------------------- profiles */

export async function submitProfile(
  form: ProfileFormData,
  importJobId?: string,
): Promise<ActionResult<{ publicRef: string }>> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()

  // Shape matches app.submit_profile's expectations; the function re-validates
  // everything and always records the caller as the manager.
  const payload = {
    relation: form.relation,
    gender: form.gender,
    fullNameGu: form.fullNameGu,
    fullNameEn: form.fullNameEn,
    dob: form.dob,
    birthTime: form.birthTimeUnknown ? '' : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    birthPlaceText: form.birthPlaceText,
    heightCm: form.heightCm,
    maritalStatus: form.maritalStatus,
    subCommunity: form.subCommunity,
    sect: form.sect,
    diet: form.diet,
    educationLevel: form.educationLevel,
    educationDetail: form.educationDetail,
    occupationType: form.occupationType,
    occupationDetail: form.occupationDetail,
    employer: form.employer,
    city: form.city,
    fatherName: form.fatherName,
    motherName: form.motherName,
    mosalName: form.mosalName,
    nativePlace: form.nativePlace,
    brothersCount: form.brothersCount,
    sistersCount: form.sistersCount,
    rashi: form.rashi,
    gan: form.gan,
    mangal: form.mangal,
    address: form.address,
    phones: form.phones.filter((p) => p.value.trim()),
    consentListing: form.consentListing,
    candidateConfirmed: form.candidateConfirmed,
    importJobId: importJobId ?? null,
    source: importJobId ? 'paste_import' : 'form',
  }

  const { data, error } = await supabase.rpc('submit_profile', { payload })
  if (error) return { ok: false, error: toError(error) }

  revalidatePath('/me')
  revalidatePath('/browse')
  return { ok: true, data: { publicRef: data as string } }
}

/** Keeps the raw paste for the parser's future training corpus. */
export async function recordImport(
  rawText: string,
  parsed: unknown,
): Promise<ActionResult<{ id: string }>> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_signed_in' }

  const { data, error } = await supabase
    .from('import_jobs')
    .insert({ user_id: user.id, raw_text: rawText, parsed, status: 'parsed' })
    .select('id')
    .single()

  if (error) return { ok: false, error: toError(error) }
  return { ok: true, data: { id: data.id } }
}

/* ------------------------------------------------------------ interests */

export async function sendInterest(
  toProfileId: string,
  message?: string,
): Promise<ActionResult<{ id: string | null }>> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('send_interest', {
    to_profile: toProfileId,
    message: message ?? null,
  })

  if (error) return { ok: false, error: toError(error) }

  revalidatePath('/interests')
  return { ok: true, data: { id: (data as string) ?? null } }
}

export async function respondToInterest(
  interestId: string,
  decision: 'accepted' | 'declined',
): Promise<ActionResult> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  // The guard trigger enforces that only the recipient may do this.
  const { error } = await supabase
    .from('interests')
    .update({ status: decision })
    .eq('id', interestId)

  if (error) return { ok: false, error: toError(error) }

  revalidatePath('/interests')
  return { ok: true, data: undefined }
}

export async function withdrawInterest(interestId: string): Promise<ActionResult> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { error } = await supabase
    .from('interests')
    .update({ status: 'withdrawn' })
    .eq('id', interestId)

  if (error) return { ok: false, error: toError(error) }

  revalidatePath('/interests')
  return { ok: true, data: undefined }
}

/* ------------------------------------------- shortlist, photos, reports */

export async function toggleShortlist(
  profileId: string,
): Promise<ActionResult<{ shortlisted: boolean }>> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_signed_in' }

  const { data: existing } = await supabase
    .from('shortlists')
    .select('profile_id')
    .eq('user_id', user.id)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('shortlists')
      .delete()
      .eq('user_id', user.id)
      .eq('profile_id', profileId)
    if (error) return { ok: false, error: toError(error) }
    revalidatePath('/browse')
    return { ok: true, data: { shortlisted: false } }
  }

  const { error } = await supabase
    .from('shortlists')
    .insert({ user_id: user.id, profile_id: profileId })
  if (error) return { ok: false, error: toError(error) }

  revalidatePath('/browse')
  return { ok: true, data: { shortlisted: true } }
}

export async function requestPhotoAccess(profileId: string): Promise<ActionResult> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_signed_in' }

  const { error } = await supabase
    .from('photo_requests')
    .insert({ profile_id: profileId, requested_by_user_id: user.id })

  // Asking twice is not an error worth showing anyone.
  if (error && error.code !== '23505') return { ok: false, error: toError(error) }
  return { ok: true, data: undefined }
}

/** Answers a photo request by issuing the grant the RLS policy actually reads. */
export async function respondToPhotoRequest(
  requestId: string,
  grant: boolean,
): Promise<ActionResult> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_signed_in' }

  const { data: req, error: readErr } = await supabase
    .from('photo_requests')
    .select('id, profile_id, requested_by_user_id')
    .eq('id', requestId)
    .single()
  if (readErr) return { ok: false, error: toError(readErr) }

  const { error } = await supabase
    .from('photo_requests')
    .update({ status: grant ? 'granted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) return { ok: false, error: toError(error) }

  if (grant) {
    const { error: grantErr } = await supabase.from('photo_access_grants').upsert(
      {
        profile_id: req.profile_id,
        granted_to_user_id: req.requested_by_user_id,
        granted_by_user_id: user.id,
        revoked_at: null,
      },
      { onConflict: 'profile_id,granted_to_user_id' },
    )
    if (grantErr) return { ok: false, error: toError(grantErr) }
  }

  revalidatePath('/me')
  return { ok: true, data: undefined }
}

export async function reportProfile(
  profileId: string,
  reason: string,
  detail?: string,
): Promise<ActionResult> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_signed_in' }

  const { error } = await supabase.from('reports').insert({
    reporter_user_id: user.id,
    subject_profile_id: profileId,
    reason,
    detail: detail ?? null,
  })

  if (error) return { ok: false, error: toError(error) }
  return { ok: true, data: undefined }
}

/* ------------------------------------------------------ own profiles */

export async function setProfileStatus(
  profileId: string,
  status: 'paused' | 'active' | 'married' | 'withdrawn',
): Promise<ActionResult> {
  if (!supabaseConfigured) return DEMO

  const supabase = await createClient()
  // The transition guard decides whether this particular move is allowed.
  const { error } = await supabase.from('profiles').update({ status }).eq('id', profileId)

  if (error) return { ok: false, error: toError(error) }

  revalidatePath('/me')
  revalidatePath('/browse')
  return { ok: true, data: undefined }
}
