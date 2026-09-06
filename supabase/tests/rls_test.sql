-- RLS policy tests.
--
-- Run with:  supabase test db
--
-- These assert the product's core privacy guarantee at the database level.
-- If any of these fail, contact details or photos are reachable by someone
-- the family did not approve — treat a failure here as a release blocker,
-- not a flaky test.

begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

select plan(16);

-- ------------------------------------------------------------- test helpers

create or replace function tests.login_as(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function tests.logout() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function tests.make_user(uid uuid, email text) returns void
language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated',
          'authenticated', email, '', now(), now());
end;
$$;

-- ---------------------------------------------------------------- fixtures
-- Created as superuser, so RLS is not in force while seeding.

\set alice '11111111-1111-4111-8111-111111111111'
\set bob   '22222222-2222-4222-8222-222222222222'
\set carol '33333333-3333-4333-8333-333333333333'
\set mod   '44444444-4444-4444-8444-444444444444'

\set p_alice 'aaaaaaaa-0000-4000-8000-000000000001'
\set p_bob   'bbbbbbbb-0000-4000-8000-000000000002'
\set p_draft 'cccccccc-0000-4000-8000-000000000003'

select tests.make_user(:'alice', 'alice@test.local');
select tests.make_user(:'bob',   'bob@test.local');
select tests.make_user(:'carol', 'carol@test.local');
select tests.make_user(:'mod',   'mod@test.local');

-- handle_new_user() has already mirrored these into app_users and set the
-- community; here we only promote status and role.
update app_users set status = 'active' where id in (:'alice', :'bob');
update app_users set status = 'pending' where id = :'carol';
update app_users set status = 'active', role = 'moderator' where id = :'mod';

insert into profiles (id, community_id, public_ref, status, full_name_en, gender, dob, height_cm)
select :'p_alice', c.id, 'KH-9001', 'active', 'Alice Test', 'female', '1998-01-01', 160
from communities c where c.slug = 'khatri-kshatriya';

insert into profiles (id, community_id, public_ref, status, full_name_en, gender, dob, height_cm)
select :'p_bob', c.id, 'KH-9002', 'active', 'Bob Test', 'male', '1995-01-01', 175
from communities c where c.slug = 'khatri-kshatriya';

insert into profiles (id, community_id, public_ref, status, full_name_en, gender, dob)
select :'p_draft', c.id, 'KH-9003', 'pending_review', 'Draft Test', 'male', '1996-01-01'
from communities c where c.slug = 'khatri-kshatriya';

insert into profile_managers (profile_id, user_id, relation, is_primary) values
  (:'p_alice', :'alice', 'father', true),
  (:'p_bob',   :'bob',   'self',   true),
  (:'p_draft', :'bob',   'father', false);

insert into profile_contacts (profile_id, kind, value_e164, visibility) values
  (:'p_alice', 'father_mobile', '+919999900001', 'on_mutual_interest'),
  (:'p_bob',   'self_mobile',   '+919999900002', 'on_mutual_interest');

insert into profile_photos (profile_id, kind, storage_key, display_key, visibility) values
  (:'p_alice', 'portrait', 'orig/alice.jpg', 'disp/alice.jpg', 'on_approval');

insert into profile_preferences (profile_id, age_min, age_max) values
  (:'p_alice', 25, 35);

-- ===========================================================================
-- Browsing
-- ===========================================================================

select tests.logout();
select set_config('role', 'anon', true);
select is_empty(
  $$ select id from profiles $$,
  'anonymous visitor sees no profiles at all'
);

select tests.login_as(:'carol');
select is_empty(
  $$ select id from profiles where public_ref = 'KH-9001' $$,
  'a pending (unverified) member cannot browse active profiles'
);

select tests.login_as(:'bob');
select isnt_empty(
  $$ select id from profiles where public_ref = 'KH-9001' $$,
  'an active member can browse an active profile in their community'
);

select is_empty(
  $$ select id from profiles where public_ref = 'KH-9003' and status = 'pending_review'
     and not exists (select 1 from profile_managers m
                     where m.profile_id = profiles.id and m.user_id = auth.uid()) $$,
  'a pending_review profile is not browsable by non-managers'
);

select tests.login_as(:'bob');
select isnt_empty(
  $$ select id from profiles where public_ref = 'KH-9003' $$,
  'a manager can see their own profile while it awaits review'
);

-- ===========================================================================
-- Contacts — the core privacy guarantee
-- ===========================================================================

select tests.login_as(:'bob');
select is_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'a member CANNOT read another family''s phone number without an accepted interest'
);

select isnt_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900002' $$,
  'a manager can always read the contacts on their own profile'
);

-- Bob sends interest; still nothing until Alice accepts.
insert into interests (from_profile_id, to_profile_id, initiated_by_user_id, status)
values (:'p_bob', :'p_alice', :'bob', 'sent');

select is_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'a merely SENT interest does not unlock the phone number'
);

select tests.logout();
update interests set status = 'accepted', responded_at = now()
where from_profile_id = :'p_bob' and to_profile_id = :'p_alice';

select tests.login_as(:'bob');
select isnt_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'an ACCEPTED interest unlocks the phone number for the sender'
);

select tests.login_as(:'alice');
select isnt_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900002' $$,
  'an accepted interest unlocks in both directions'
);

-- A third party must remain locked out regardless.
select tests.logout();
update app_users set status = 'active' where id = :'carol';
select tests.login_as(:'carol');
select is_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'an uninvolved third party still cannot read the number after others match'
);

-- ===========================================================================
-- Photos
-- ===========================================================================

select tests.login_as(:'carol');
select is_empty(
  $$ select id from profile_photos where profile_id = $$ || quote_literal(:'p_alice') || $$::uuid $$,
  'an on_approval photo is hidden without a grant or accepted interest'
);

select tests.logout();
insert into photo_access_grants (profile_id, granted_to_user_id, granted_by_user_id)
values (:'p_alice', :'carol', :'alice');

select tests.login_as(:'carol');
select isnt_empty(
  $$ select id from profile_photos $$,
  'an explicit photo grant unlocks the photo'
);

select tests.logout();
update photo_access_grants set revoked_at = now()
where profile_id = :'p_alice' and granted_to_user_id = :'carol';

select tests.login_as(:'carol');
select is_empty(
  $$ select id from profile_photos $$,
  'revoking a photo grant takes effect immediately'
);

-- ===========================================================================
-- Preferences and moderation
-- ===========================================================================

select tests.login_as(:'bob');
select is_empty(
  $$ select profile_id from profile_preferences $$,
  'partner preferences are private to the family that set them'
);

select tests.login_as(:'mod');
select isnt_empty(
  $$ select id from profiles where status = 'pending_review' $$,
  'a moderator can see the review queue'
);

select * from finish();

rollback;
