-- RLS policy tests.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_test.sql
--   (or `supabase test db` once the CLI is installed)
--
-- These assert the product's core privacy guarantee at the database level.
-- A failure here means contact details or photos are reachable by someone the
-- family never approved — treat it as a release blocker, not a flaky test.
--
-- Role switching is done with plain `set local role` / `reset role` rather
-- than helper functions: once you are `authenticated` you have no USAGE on a
-- private schema, and you cannot SET ROLE back to postgres. RESET ROLE can.

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

\set alice '11111111-1111-4111-8111-111111111111'
\set bob   '22222222-2222-4222-8222-222222222222'
\set carol '33333333-3333-4333-8333-333333333333'
\set moder '44444444-4444-4444-8444-444444444444'

\set p_alice 'aaaaaaaa-0000-4000-8000-000000000001'
\set p_bob   'bbbbbbbb-0000-4000-8000-000000000002'
\set p_draft 'cccccccc-0000-4000-8000-000000000003'

-- ---------------------------------------------------------------- fixtures
-- Seeded as superuser, so RLS is not in force here.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', :'alice', 'authenticated', 'authenticated', 'alice@test.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', :'bob',   'authenticated', 'authenticated', 'bob@test.local',   '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', :'carol', 'authenticated', 'authenticated', 'carol@test.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', :'moder', 'authenticated', 'authenticated', 'mod@test.local',   '', now(), now());

-- handle_new_user() already mirrored these into app_users; set status/role.
update app_users set status = 'active'   where id in (:'alice', :'bob');
update app_users set status = 'pending'  where id = :'carol';
update app_users set status = 'active', role = 'moderator' where id = :'moder';

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

insert into profile_photos (profile_id, kind, storage_key, display_key, visibility)
values (:'p_alice', 'portrait', 'orig/alice.jpg', 'disp/alice.jpg', 'on_approval');

insert into profile_preferences (profile_id, age_min, age_max)
values (:'p_alice', 25, 35);

-- ===========================================================================
-- Browsing
-- ===========================================================================

set local role anon;
select is_empty(
  $$ select id from profiles $$,
  'anonymous visitor sees no profiles at all'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'carol', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select id from profiles where public_ref = 'KH-9001' $$,
  'a pending (unverified) member cannot browse active profiles'
);

reset role;
update app_users set status = 'active' where id = :'carol';

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'bob', 'role', 'authenticated')::text, true);
select isnt_empty(
  $$ select id from profiles where public_ref = 'KH-9001' $$,
  'an active member can browse an active profile in their community'
);
select isnt_empty(
  $$ select id from profiles where public_ref = 'KH-9003' $$,
  'a manager can see their own profile while it awaits review'
);

select set_config('request.jwt.claims',
  json_build_object('sub', :'carol', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select id from profiles where public_ref = 'KH-9003' $$,
  'a pending_review profile is invisible to a member who does not manage it'
);

-- ===========================================================================
-- Contacts — the core privacy guarantee
-- ===========================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', :'bob', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'a member CANNOT read another family''s phone number without an accepted interest'
);
select isnt_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900002' $$,
  'a manager can always read the contacts on their own profile'
);

reset role;
insert into interests (from_profile_id, to_profile_id, initiated_by_user_id, status)
values (:'p_bob', :'p_alice', :'bob', 'sent');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'bob', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'a merely SENT interest does not unlock the phone number'
);

reset role;
update interests set status = 'accepted', responded_at = now()
where from_profile_id = :'p_bob' and to_profile_id = :'p_alice';

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'bob', 'role', 'authenticated')::text, true);
select isnt_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'an ACCEPTED interest unlocks the phone number for the sender'
);

select set_config('request.jwt.claims',
  json_build_object('sub', :'alice', 'role', 'authenticated')::text, true);
select isnt_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900002' $$,
  'an accepted interest unlocks in both directions'
);

select set_config('request.jwt.claims',
  json_build_object('sub', :'carol', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select id from profile_contacts where value_e164 = '+919999900001' $$,
  'an uninvolved third party still cannot read the number after others match'
);

-- ===========================================================================
-- Photos
-- ===========================================================================

select is_empty(
  $$ select id from profile_photos $$,
  'an on_approval photo is hidden without a grant or accepted interest'
);

reset role;
insert into photo_access_grants (profile_id, granted_to_user_id, granted_by_user_id)
values (:'p_alice', :'carol', :'alice');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'carol', 'role', 'authenticated')::text, true);
select isnt_empty(
  $$ select id from profile_photos $$,
  'an explicit photo grant unlocks the photo'
);

reset role;
update photo_access_grants set revoked_at = now()
where profile_id = :'p_alice' and granted_to_user_id = :'carol';

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'carol', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select id from profile_photos $$,
  'revoking a photo grant takes effect immediately'
);

-- ===========================================================================
-- Preferences and moderation
-- ===========================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', :'bob', 'role', 'authenticated')::text, true);
select is_empty(
  $$ select profile_id from profile_preferences $$,
  'partner preferences are private to the family that set them'
);

select set_config('request.jwt.claims',
  json_build_object('sub', :'moder', 'role', 'authenticated')::text, true);
select isnt_empty(
  $$ select id from profiles where status = 'pending_review' $$,
  'a moderator can see the review queue'
);

-- ===========================================================================
-- Privilege escalation
--
-- RLS filters rows, not columns. These four exist because both of the
-- `for update` policies originally let a member rewrite any column of a row
-- they were allowed to touch — including their own role, and their own
-- profile's moderation status.
-- ===========================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', :'bob', 'role', 'authenticated')::text, true);

select throws_ok(
  format($$ update app_users set role = 'admin' where id = %L $$, :'bob'),
  '42501',
  null,
  'a member cannot promote themselves to admin'
);

select throws_ok(
  format($$ update app_users set status = 'active' where id = %L $$, :'bob'),
  '42501',
  null,
  'a member cannot change their own membership status'
);

select throws_ok(
  format($$ update profiles set status = 'active' where id = %L $$, :'p_draft'),
  '42501',
  null,
  'a family cannot publish their own profile and bypass moderation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'alice', 'role', 'authenticated')::text, true);

select lives_ok(
  format($$ update profiles set status = 'paused' where id = %L $$, :'p_alice'),
  'a family CAN pause their own live profile'
);

reset role;
select * from finish();

rollback;
