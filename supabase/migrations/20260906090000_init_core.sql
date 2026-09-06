-- Samaj Setu — core schema
-- See docs/DATA-MODEL.md. Community taxonomy lives in data, never in enums.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists app;

-- ---------------------------------------------------------------- tenancy

create table communities (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name_en       text not null,
  name_gu       text not null,
  default_locale text not null default 'gu',
  config        jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table taxonomy_terms (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  kind         text not null check (kind in
                 ('sub_community','sect','education_level','occupation_type','diet')),
  code         text not null,
  label_en     text not null,
  label_gu     text not null,
  sort_order   int  not null default 0,
  unique (community_id, kind, code)
);

create index on taxonomy_terms (community_id, kind, sort_order);

-- ---------------------------------------------------------------- identity

-- Mirrors auth.users. Populated by the handle_new_user trigger below.
create table app_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  community_id uuid references communities(id),
  phone_e164   text unique,
  display_name text,
  locale       text not null default 'gu',
  role         text not null default 'member' check (role in ('member','moderator','admin')),
  status       text not null default 'pending' check (status in ('pending','active','suspended')),
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on app_users (community_id, status);

-- ---------------------------------------------------------------- profiles

create table profiles (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id),
  public_ref   text unique not null,
  status       text not null default 'draft' check (status in
                 ('draft','pending_review','active','paused','married','withdrawn','rejected')),

  full_name_gu text,
  full_name_en text,
  gender       text check (gender in ('male','female')),
  dob          date,
  birth_time   time,
  birth_time_accuracy text not null default 'unknown'
                 check (birth_time_accuracy in ('exact','approx','unknown')),
  birth_place_text text,
  birth_place_lat  numeric(9,6),
  birth_place_lng  numeric(9,6),
  birth_place_tz   text default 'Asia/Kolkata',

  height_cm      int check (height_cm between 120 and 220),
  marital_status text default 'never_married'
                 check (marital_status in ('never_married','divorced','widowed')),

  sub_community_term_id  uuid references taxonomy_terms(id),
  sect_term_id           uuid references taxonomy_terms(id),
  diet_term_id           uuid references taxonomy_terms(id),
  education_level_term_id uuid references taxonomy_terms(id),
  occupation_type_term_id uuid references taxonomy_terms(id),

  education_detail  text,
  occupation_detail text,
  employer          text,
  income_band       text,

  city    text,
  state   text default 'Gujarat',
  country text default 'India',

  about_gu text,
  about_en text,

  source     text not null default 'form' check (source in ('paste_import','form','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on profiles (community_id, status, gender);
create index on profiles (dob);
create index on profiles (height_cm);
create index on profiles (city);
create index on profiles (sub_community_term_id);
create index on profiles (sect_term_id);

-- Human-friendly reference shown on shared biodata cards: KK-1042
create sequence profile_ref_seq start 1001;

create or replace function app.next_public_ref(p_community_slug text)
returns text language sql volatile as $$
  select upper(left(regexp_replace(p_community_slug, '[^a-zA-Z]', '', 'g'), 2))
         || '-' || nextval('profile_ref_seq')::text;
$$;

create table profile_managers (
  profile_id uuid not null references profiles(id) on delete cascade,
  user_id    uuid not null references app_users(id) on delete cascade,
  relation   text not null default 'self' check (relation in
               ('self','father','mother','brother','sister','relative')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, user_id)
);

create index on profile_managers (user_id);

create table profile_family (
  profile_id       uuid primary key references profiles(id) on delete cascade,
  father_name      text,
  mother_name      text,
  father_occupation text,
  mother_occupation text,
  -- mosal = maternal grandfather's family. Shared mosal disqualifies a match.
  mosal_name       text,
  mosal_surname    text,
  paternal_surname text,
  native_place     text,
  brothers_count   int,
  sisters_count    int,
  family_type      text check (family_type in ('joint','nuclear')),
  address          text
);

create index on profile_family (mosal_surname);
create index on profile_family (paternal_surname);

create table profile_contacts (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in
               ('self_mobile','father_mobile','mother_mobile','whatsapp','email')),
  value_e164 text not null,
  label      text,
  visibility text not null default 'on_mutual_interest'
               check (visibility in ('on_mutual_interest','on_request','community')),
  is_primary boolean not null default false
);

create index on profile_contacts (profile_id);

create table profile_photos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('portrait','janmakshar','family')),
  storage_key text not null,
  display_key text,
  blur_key    text,
  visibility  text not null default 'on_approval'
                check (visibility in ('on_approval','community','private')),
  is_primary  boolean not null default false,
  ocr_text    text,
  created_at  timestamptz not null default now()
);

create index on profile_photos (profile_id, kind);

-- ---------------------------------------------------------------- astrology

create table profile_astro (
  profile_id uuid primary key references profiles(id) on delete cascade,

  declared_rashi     text,
  declared_nakshatra text,
  declared_gan       text check (declared_gan in ('dev','manushya','rakshas')),
  declared_mangal    text check (declared_mangal in ('none','low','high','unknown')),

  computed_rashi         text,
  computed_nakshatra     text,
  computed_nakshatra_pada int check (computed_nakshatra_pada between 1 and 4),
  computed_gan   text check (computed_gan in ('dev','manushya','rakshas')),
  computed_nadi  text check (computed_nadi in ('aadi','madhya','antya')),
  computed_yoni  text,
  computed_varna text,
  computed_vashya text,
  computed_mangal text check (computed_mangal in ('none','low','high','unknown')),

  chart          jsonb,
  engine_version text,
  confidence     text check (confidence in ('high','medium','low','none')),
  computed_at    timestamptz
);

-- ------------------------------------------------- preferences & exclusions

create table profile_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  age_min int, age_max int,
  height_min_cm int, height_max_cm int,
  sub_community_term_ids uuid[] not null default '{}',
  sect_term_ids          uuid[] not null default '{}',
  education_level_term_ids uuid[] not null default '{}',
  cities text[] not null default '{}',
  marital_statuses text[] not null default '{}',
  manglik_preference text not null default 'either'
    check (manglik_preference in ('only_manglik','only_non_manglik','either')),
  min_guna int check (min_guna between 0 and 36),
  require_astro_match boolean not null default false,
  notes_gu text
);

create table profile_exclusions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in
               ('mosal_surname','paternal_surname','family','profile')),
  value      text not null,
  reason     text
);

create index on profile_exclusions (profile_id, kind);

-- ---------------------------------------------------------------- matching

create table match_scores (
  a_profile_id uuid not null references profiles(id) on delete cascade,
  b_profile_id uuid not null references profiles(id) on delete cascade,
  hard_blocks      jsonb not null default '[]'::jsonb,
  guna_total       int check (guna_total between 0 and 36),
  guna_breakdown   jsonb,
  mangal_compatible boolean,
  preference_score numeric(4,3),
  total_score      numeric(6,3),
  explanation      jsonb not null default '[]'::jsonb,
  computed_at      timestamptz not null default now(),
  primary key (a_profile_id, b_profile_id),
  constraint ordered_pair check (a_profile_id < b_profile_id)
);

create index on match_scores (a_profile_id, total_score desc);
create index on match_scores (b_profile_id, total_score desc);

-- ------------------------------------------------------------- interaction

create table interests (
  id                  uuid primary key default gen_random_uuid(),
  from_profile_id     uuid not null references profiles(id) on delete cascade,
  to_profile_id       uuid not null references profiles(id) on delete cascade,
  initiated_by_user_id uuid not null references app_users(id),
  status  text not null default 'sent'
            check (status in ('sent','accepted','declined','withdrawn','expired')),
  message_gu   text,
  responded_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint no_self_interest check (from_profile_id <> to_profile_id),
  unique (from_profile_id, to_profile_id)
);

create index on interests (to_profile_id, status);
create index on interests (from_profile_id, status);

create table photo_access_grants (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  granted_to_user_id uuid not null references app_users(id) on delete cascade,
  granted_by_user_id uuid not null references app_users(id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, granted_to_user_id)
);

create table profile_views (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  viewer_user_id uuid not null references app_users(id) on delete cascade,
  viewed_at      timestamptz not null default now()
);

create index on profile_views (profile_id, viewed_at desc);

-- -------------------------------------------------------------- governance

create table profile_reviews (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  reviewer_user_id uuid not null references app_users(id),
  decision text not null check (decision in ('approve','reject','changes_requested')),
  notes    text,
  reviewed_at timestamptz not null default now()
);

create table reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_user_id   uuid not null references app_users(id),
  subject_profile_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolved_by uuid references app_users(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- DPDP Act 2023: consent is captured per purpose, and we record whether the
-- candidate themselves confirmed (parents routinely act on their behalf).
create table consents (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in
         ('listing','photo_display','contact_share','astro_processing')),
  granted_by_user_id  uuid not null references app_users(id),
  candidate_confirmed boolean not null default false,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index on consents (profile_id, kind);

create table audit_log (
  id            bigserial primary key,
  actor_user_id uuid references app_users(id),
  action        text not null,
  subject_type  text,
  subject_id    uuid,
  before        jsonb,
  after         jsonb,
  at            timestamptz not null default now()
);

create index on audit_log (subject_type, subject_id, at desc);

-- ------------------------------------------------------------------ import

create table import_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app_users(id) on delete cascade,
  raw_text        text not null,
  normalised_text text,
  parsed          jsonb,
  field_confidence jsonb,
  model  text,
  status text not null default 'pending'
           check (status in ('pending','parsed','confirmed','failed')),
  error_detail text,
  profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on import_jobs (user_id, created_at desc);

-- ---------------------------------------------------------------- triggers

create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger t_communities_touch before update on communities
  for each row execute function app.touch_updated_at();
create trigger t_app_users_touch before update on app_users
  for each row execute function app.touch_updated_at();
create trigger t_profiles_touch before update on profiles
  for each row execute function app.touch_updated_at();

-- Mirror new auth.users rows into app_users so RLS has something to join on.
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into app_users (id, phone_e164, community_id)
  values (
    new.id,
    new.phone,
    (select id from communities where slug = 'khatri-kshatriya')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger t_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
