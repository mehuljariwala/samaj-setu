-- The write path: submit a profile, express interest, respond, shortlist,
-- request a photo. Plus two more fixes of the same family as 20260906100000.

-- ==========================================================================
-- Fix 1: the sender could accept their own interest
--
-- `interests_update` allowed either side to write any column, so the sender
-- could set status='accepted' and unlock the other family's phone number
-- without them ever agreeing. That is the single thing this product promises
-- not to allow.
-- ==========================================================================

create or replace function app.guard_interest_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_sender    boolean := app.manages_profile(old.from_profile_id);
  is_recipient boolean := app.manages_profile(old.to_profile_id);
begin
  new.from_profile_id      := old.from_profile_id;
  new.to_profile_id        := old.to_profile_id;
  new.initiated_by_user_id := old.initiated_by_user_id;

  if new.status is distinct from old.status and not app.is_moderator() then
    if old.status <> 'sent' then
      raise exception 'interest is already %', old.status
        using errcode = 'insufficient_privilege';
    end if;

    -- Only the receiving family may accept or decline. Only the sender may
    -- withdraw.
    if new.status in ('accepted', 'declined') and not is_recipient then
      raise exception 'only the receiving family may % an interest', new.status
        using errcode = 'insufficient_privilege';
    end if;
    if new.status = 'withdrawn' and not is_sender then
      raise exception 'only the sending family may withdraw an interest'
        using errcode = 'insufficient_privilege';
    end if;
    if new.status not in ('accepted', 'declined', 'withdrawn') then
      raise exception 'invalid interest status %', new.status
        using errcode = 'check_violation';
    end if;

    new.responded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists t_interests_guard on interests;
create trigger t_interests_guard
  before update on interests
  for each row execute function app.guard_interest_transition();

-- ==========================================================================
-- Fix 2: the first manager row could never be inserted
--
-- `managers_write` required manages_profile(), which is false until a manager
-- row exists. Chicken and egg: no profile could ever be created over the API.
-- ==========================================================================

create or replace function app.profile_has_managers(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile_managers where profile_id = p);
$$;

drop policy if exists managers_write on profile_managers;

create policy managers_insert on profile_managers for insert with check (
  app.is_moderator()
  or app.manages_profile(profile_id)
  -- Claiming an unclaimed profile you just created.
  or (user_id = (select auth.uid()) and not app.profile_has_managers(profile_id))
);

create policy managers_update on profile_managers for update
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

create policy managers_delete on profile_managers for delete
  using (app.manages_profile(profile_id) or app.is_moderator());

-- ==========================================================================
-- Shortlist and photo requests
-- ==========================================================================

create table if not exists shortlists (
  user_id    uuid not null references app_users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

alter table shortlists enable row level security;

create policy shortlists_own on shortlists for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and app.can_browse(profile_id));

-- A request is a notification; the grant is the family's answer to it.
create table if not exists photo_requests (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  requested_by_user_id uuid not null references app_users(id) on delete cascade,
  status            text not null default 'pending'
                      check (status in ('pending','granted','declined')),
  created_at        timestamptz not null default now(),
  responded_at      timestamptz,
  unique (profile_id, requested_by_user_id)
);

alter table photo_requests enable row level security;

create policy photo_requests_read on photo_requests for select
  using (requested_by_user_id = (select auth.uid())
         or app.manages_profile(profile_id)
         or app.is_moderator());

create policy photo_requests_insert on photo_requests for insert
  with check (requested_by_user_id = (select auth.uid()) and app.can_browse(profile_id));

-- Only the owning family answers a request.
create policy photo_requests_update on photo_requests for update
  using (app.manages_profile(profile_id))
  with check (app.manages_profile(profile_id));

-- ==========================================================================
-- submit_profile
--
-- SECURITY DEFINER because this writes six tables atomically and has to create
-- the profile before the manager row that would authorise writing to it. The
-- function does the authorisation itself: active member, own community, and
-- the caller is always recorded as the manager — the payload cannot name
-- someone else.
-- ==========================================================================

create or replace function app.submit_profile(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := (select auth.uid());
  v_community uuid;
  v_profile   uuid := gen_random_uuid();
  v_ref       text;
  v_name_gu   text := nullif(trim(payload->>'fullNameGu'), '');
  v_name_en   text := nullif(trim(payload->>'fullNameEn'), '');
  v_mosal     text := nullif(trim(payload->>'mosalName'), '');
  v_phone     jsonb;
  v_term      uuid;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  if not app.is_active_member() then
    raise exception 'your membership is not active yet'
      using errcode = 'insufficient_privilege';
  end if;

  select community_id into v_community from app_users where id = v_user;

  if coalesce(v_name_gu, v_name_en) is null then
    raise exception 'a name is required' using errcode = 'check_violation';
  end if;
  if payload->>'gender' not in ('male','female') then
    raise exception 'gender is required' using errcode = 'check_violation';
  end if;
  if v_mosal is null then
    raise exception 'mosal is required' using errcode = 'check_violation';
  end if;
  -- DPDP: no listing without both consents recorded.
  if not coalesce((payload->>'consentListing')::boolean, false)
     or not coalesce((payload->>'candidateConfirmed')::boolean, false) then
    raise exception 'consent is required' using errcode = 'check_violation';
  end if;

  v_ref := app.next_public_ref('khatri-kshatriya');

  insert into profiles (
    id, community_id, public_ref, status,
    full_name_gu, full_name_en, gender, dob, birth_time, birth_time_accuracy,
    birth_place_text, height_cm, marital_status,
    sub_community_term_id, sect_term_id, diet_term_id,
    education_level_term_id, occupation_type_term_id,
    education_detail, occupation_detail, employer, city, source
  ) values (
    v_profile, v_community, v_ref, 'pending_review',
    v_name_gu, v_name_en,
    payload->>'gender',
    nullif(payload->>'dob','')::date,
    nullif(payload->>'birthTime','')::time,
    case when coalesce((payload->>'birthTimeUnknown')::boolean, false) then 'unknown'
         when nullif(payload->>'birthTime','') is null then 'unknown'
         else 'exact' end,
    nullif(payload->>'birthPlaceText',''),
    nullif(payload->>'heightCm','')::int,
    coalesce(nullif(payload->>'maritalStatus',''), 'never_married'),
    app.term_id(v_community, 'sub_community',   payload->>'subCommunity'),
    app.term_id(v_community, 'sect',            payload->>'sect'),
    app.term_id(v_community, 'diet',            payload->>'diet'),
    app.term_id(v_community, 'education_level', payload->>'educationLevel'),
    app.term_id(v_community, 'occupation_type', payload->>'occupationType'),
    nullif(payload->>'educationDetail',''),
    nullif(payload->>'occupationDetail',''),
    nullif(payload->>'employer',''),
    nullif(payload->>'city',''),
    coalesce(nullif(payload->>'source',''), 'form')
  );

  insert into profile_managers (profile_id, user_id, relation, is_primary)
  values (v_profile, v_user,
          coalesce(nullif(payload->>'relation',''), 'relative'), true);

  insert into profile_family (
    profile_id, father_name, mother_name, mosal_name, mosal_surname,
    paternal_surname, native_place, brothers_count, sisters_count, address
  ) values (
    v_profile,
    nullif(payload->>'fatherName',''),
    nullif(payload->>'motherName',''),
    v_mosal,
    app.last_token(v_mosal),
    app.last_token(coalesce(v_name_gu, v_name_en)),
    nullif(payload->>'nativePlace',''),
    nullif(payload->>'brothersCount','')::int,
    nullif(payload->>'sistersCount','')::int,
    nullif(payload->>'address','')
  );

  insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
  values (
    v_profile,
    nullif(payload->>'rashi',''),
    nullif(payload->>'gan',''),
    nullif(payload->>'mangal',''),
    case when coalesce((payload->>'birthTimeUnknown')::boolean, false) then 'low' else 'medium' end
  );

  for v_phone in select * from jsonb_array_elements(coalesce(payload->'phones','[]'::jsonb))
  loop
    if nullif(v_phone->>'value','') is not null then
      insert into profile_contacts (profile_id, kind, value_e164, visibility)
      values (v_profile,
              coalesce(nullif(v_phone->>'kind',''), 'self_mobile'),
              v_phone->>'value',
              'on_mutual_interest');
    end if;
  end loop;

  insert into consents (profile_id, kind, granted_by_user_id, candidate_confirmed, policy_version)
  select v_profile, k, v_user, true, coalesce(nullif(payload->>'policyVersion',''), '2026-09-06')
  from unnest(array['listing','contact_share','astro_processing']) as k;

  if nullif(payload->>'importJobId','') is not null then
    update import_jobs
       set status = 'confirmed', profile_id = v_profile
     where id = (payload->>'importJobId')::uuid and user_id = v_user;
  end if;

  insert into audit_log (actor_user_id, action, subject_type, subject_id, after)
  values (v_user, 'profile.submit', 'profile', v_profile,
          jsonb_build_object('public_ref', v_ref));

  return v_ref;
end;
$$;

-- Small helpers used above.
create or replace function app.term_id(p_community uuid, p_kind text, p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from taxonomy_terms
  where community_id = p_community and kind = p_kind and code = nullif(p_code, '');
$$;

create or replace function app.last_token(p text)
returns text language sql immutable as $$
  select nullif((regexp_split_to_array(trim(p), '\s+'))[
    array_length(regexp_split_to_array(trim(p), '\s+'), 1)
  ], '');
$$;

revoke all on function app.submit_profile(jsonb) from public;
grant execute on function app.submit_profile(jsonb) to authenticated;

-- ==========================================================================
-- Interests
-- ==========================================================================

create or replace function app.send_interest(
  p_to_profile uuid,
  p_from_profile uuid default null,
  p_message text default null
)
returns uuid
language plpgsql
security invoker           -- RLS on `interests` already expresses the rules
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_from uuid := p_from_profile;
  v_id   uuid;
begin
  -- Most families manage exactly one profile; don't make them pick.
  if v_from is null then
    select pm.profile_id into v_from
    from profile_managers pm
    join profiles p on p.id = pm.profile_id
    where pm.user_id = v_user and p.status in ('active','pending_review')
    order by pm.is_primary desc
    limit 1;
  end if;

  if v_from is null then
    raise exception 'add your own biodata before sending an interest'
      using errcode = 'check_violation';
  end if;

  insert into interests (from_profile_id, to_profile_id, initiated_by_user_id, message_gu)
  values (v_from, p_to_profile, v_user, nullif(p_message, ''))
  on conflict (from_profile_id, to_profile_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function app.send_interest(uuid, uuid, text) to authenticated;

-- The demo profiles were seeded with explicit refs KH-1001..KH-1008 while the
-- sequence still sat at 1001, so the first real submission would collide.
select setval('profile_ref_seq', greatest(
  (select coalesce(max(nullif(regexp_replace(public_ref, '\D', '', 'g'), ''))::bigint, 1000) from profiles),
  1000
) + 1);
-- Both guards fire for service-role and direct psql access too, where
-- auth.uid() is null. Those paths are already privileged (RLS has no policy
-- letting `anon` reach these rows at all), so the guard should stand aside
-- rather than lock the operator out of their own database.

create or replace function app.guard_profile_transition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then
    return new;  -- service role / superuser; RLS already gated the row
  end if;

  new.id           := old.id;
  new.community_id := old.community_id;
  new.public_ref   := old.public_ref;

  if new.status is distinct from old.status and not app.is_moderator() then
    if not (
         (old.status = 'draft'          and new.status = 'pending_review')
      or (old.status = 'rejected'       and new.status = 'pending_review')
      or (old.status = 'pending_review' and new.status = 'withdrawn')
      or (old.status = 'active'         and new.status in ('paused','married','withdrawn'))
      or (old.status = 'paused'         and new.status in ('active','married','withdrawn'))
    ) then
      raise exception 'a family cannot move a profile from % to %', old.status, new.status
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create or replace function app.guard_interest_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_sender    boolean;
  is_recipient boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  is_sender    := app.manages_profile(old.from_profile_id);
  is_recipient := app.manages_profile(old.to_profile_id);

  new.from_profile_id      := old.from_profile_id;
  new.to_profile_id        := old.to_profile_id;
  new.initiated_by_user_id := old.initiated_by_user_id;

  if new.status is distinct from old.status and not app.is_moderator() then
    if old.status <> 'sent' then
      raise exception 'interest is already %', old.status
        using errcode = 'insufficient_privilege';
    end if;
    if new.status in ('accepted', 'declined') and not is_recipient then
      raise exception 'only the receiving family may % an interest', new.status
        using errcode = 'insufficient_privilege';
    end if;
    if new.status = 'withdrawn' and not is_sender then
      raise exception 'only the sending family may withdraw an interest'
        using errcode = 'insufficient_privilege';
    end if;
    new.responded_at := now();
  end if;

  return new;
end;
$$;
