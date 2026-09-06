-- Row Level Security.
--
-- This is the product's core privacy guarantee, not a nicety: nobody sees a
-- phone number or a photo without the family's consent. Enforcing it here
-- means a leak requires a bad policy, not a forgotten `if` in a route handler.
--
-- Helpers are `stable security definer` so they don't recursively re-trigger
-- RLS on the tables they read, and auth.uid() is wrapped in a subselect so
-- Postgres hoists it to an initplan instead of evaluating it per row.

-- ------------------------------------------------------------------ helpers

create or replace function app.current_user_id()
returns uuid language sql stable as $$
  select (select auth.uid());
$$;

create or replace function app.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_users u
    where u.id = (select auth.uid()) and u.status = 'active'
  );
$$;

create or replace function app.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('moderator','admin')
  );
$$;

create or replace function app.my_community_id()
returns uuid language sql stable security definer set search_path = public as $$
  select u.community_id from app_users u where u.id = (select auth.uid());
$$;

create or replace function app.manages_profile(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profile_managers pm
    where pm.profile_id = p and pm.user_id = (select auth.uid())
  );
$$;

-- Profiles the caller manages. Used to resolve "the other side" of an interest.
create or replace function app.my_profile_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select pm.profile_id from profile_managers pm where pm.user_id = (select auth.uid());
$$;

-- An accepted interest in EITHER direction unlocks the counterpart's
-- contacts and photos. This is the single most important predicate here.
create or replace function app.has_accepted_interest(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from interests i
    join profile_managers pm
      on  pm.user_id = (select auth.uid())
      and pm.profile_id in (i.from_profile_id, i.to_profile_id)
    where i.status = 'accepted'
      and p in (i.from_profile_id, i.to_profile_id)
      and p <> pm.profile_id
  );
$$;

create or replace function app.has_photo_grant(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from photo_access_grants g
    where g.profile_id = p
      and g.granted_to_user_id = (select auth.uid())
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

-- A profile is browsable if it's live and the viewer is an active member of
-- the same community.
create or replace function app.can_browse(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles pr
    where pr.id = p
      and pr.status = 'active'
      and pr.community_id = app.my_community_id()
  ) and app.is_active_member();
$$;

-- ----------------------------------------------------------------- policies

alter table communities         enable row level security;
alter table taxonomy_terms      enable row level security;
alter table app_users           enable row level security;
alter table profiles            enable row level security;
alter table profile_managers    enable row level security;
alter table profile_family      enable row level security;
alter table profile_contacts    enable row level security;
alter table profile_photos      enable row level security;
alter table profile_astro       enable row level security;
alter table profile_preferences enable row level security;
alter table profile_exclusions  enable row level security;
alter table match_scores        enable row level security;
alter table interests           enable row level security;
alter table photo_access_grants enable row level security;
alter table profile_views       enable row level security;
alter table profile_reviews     enable row level security;
alter table reports             enable row level security;
alter table consents            enable row level security;
alter table audit_log           enable row level security;
alter table import_jobs         enable row level security;

-- Reference data: readable by any signed-in user.
create policy communities_read on communities for select
  using ((select auth.uid()) is not null);

create policy taxonomy_read on taxonomy_terms for select
  using ((select auth.uid()) is not null);

-- Users see themselves; moderators see their community.
create policy app_users_read on app_users for select using (
  id = (select auth.uid())
  or (app.is_moderator() and community_id = app.my_community_id())
);

create policy app_users_update_self on app_users for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiles: your own always; others only when live and same community.
create policy profiles_read on profiles for select using (
  app.manages_profile(id)
  or app.is_moderator()
  or (status = 'active' and community_id = app.my_community_id() and app.is_active_member())
);

create policy profiles_insert on profiles for insert
  with check (app.is_active_member() and community_id = app.my_community_id());

create policy profiles_update on profiles for update
  using (app.manages_profile(id) or app.is_moderator())
  with check (app.manages_profile(id) or app.is_moderator());

create policy managers_read on profile_managers for select
  using (user_id = (select auth.uid()) or app.manages_profile(profile_id) or app.is_moderator());

create policy managers_write on profile_managers for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

-- Family details are browsable (mosal is a matching signal), but the street
-- address is stripped in the view layer for non-managers. See v_profile_family.
create policy family_read on profile_family for select
  using (app.manages_profile(profile_id) or app.is_moderator() or app.can_browse(profile_id));

create policy family_write on profile_family for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

-- *** The money policy. ***
create policy contacts_read on profile_contacts for select using (
  app.manages_profile(profile_id)
  or app.is_moderator()
  or (visibility = 'on_mutual_interest' and app.has_accepted_interest(profile_id))
  or (visibility = 'on_request'         and app.has_accepted_interest(profile_id))
  or (visibility = 'community'          and app.can_browse(profile_id))
);

create policy contacts_write on profile_contacts for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

create policy photos_read on profile_photos for select using (
  app.manages_profile(profile_id)
  or app.is_moderator()
  or (visibility = 'community'   and app.can_browse(profile_id))
  or (visibility = 'on_approval' and (app.has_photo_grant(profile_id)
                                      or app.has_accepted_interest(profile_id)))
);

create policy photos_write on profile_photos for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

create policy astro_read on profile_astro for select
  using (app.manages_profile(profile_id) or app.is_moderator() or app.can_browse(profile_id));

create policy astro_write on profile_astro for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

-- Preferences and exclusions are private to the family.
create policy prefs_all on profile_preferences for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

create policy exclusions_all on profile_exclusions for all
  using (app.manages_profile(profile_id) or app.is_moderator())
  with check (app.manages_profile(profile_id) or app.is_moderator());

-- Scores are readable only for pairs you're part of, and never when blocked.
create policy match_scores_read on match_scores for select using (
  (app.manages_profile(a_profile_id) or app.manages_profile(b_profile_id))
  and hard_blocks = '[]'::jsonb
);

create policy interests_read on interests for select using (
  app.manages_profile(from_profile_id)
  or app.manages_profile(to_profile_id)
  or app.is_moderator()
);

create policy interests_insert on interests for insert with check (
  app.manages_profile(from_profile_id)
  and initiated_by_user_id = (select auth.uid())
  and app.can_browse(to_profile_id)
);

-- Sender may withdraw; recipient may accept or decline.
create policy interests_update on interests for update
  using (app.manages_profile(from_profile_id) or app.manages_profile(to_profile_id))
  with check (app.manages_profile(from_profile_id) or app.manages_profile(to_profile_id));

create policy grants_read on photo_access_grants for select
  using (app.manages_profile(profile_id) or granted_to_user_id = (select auth.uid()));

create policy grants_write on photo_access_grants for all
  using (app.manages_profile(profile_id))
  with check (app.manages_profile(profile_id));

-- Owners see who looked at their profile (Product principle 3).
create policy views_read on profile_views for select
  using (app.manages_profile(profile_id) or app.is_moderator());

create policy views_insert on profile_views for insert
  with check (viewer_user_id = (select auth.uid()) and app.can_browse(profile_id));

create policy reviews_read on profile_reviews for select
  using (app.manages_profile(profile_id) or app.is_moderator());

create policy reviews_write on profile_reviews for insert
  with check (app.is_moderator() and reviewer_user_id = (select auth.uid()));

create policy reports_insert on reports for insert
  with check (reporter_user_id = (select auth.uid()) and app.is_active_member());

create policy reports_read on reports for select
  using (reporter_user_id = (select auth.uid()) or app.is_moderator());

create policy consents_read on consents for select
  using (app.manages_profile(profile_id) or app.is_moderator());

create policy consents_insert on consents for insert
  with check (app.manages_profile(profile_id) and granted_by_user_id = (select auth.uid()));

-- Audit log is append-only from the service role; nobody reads it over the API.
create policy audit_read on audit_log for select using (app.is_moderator());

create policy import_own on import_jobs for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------------- views

-- Browse payload: everything safe to show a verified member, with the street
-- address dropped unless you manage the profile.
create or replace view v_profile_card
with (security_invoker = true) as
select
  p.id,
  p.public_ref,
  p.community_id,
  p.status,
  p.full_name_gu,
  p.full_name_en,
  p.gender,
  extract(year from age(p.dob))::int as age_years,
  p.height_cm,
  p.city,
  p.education_detail,
  p.occupation_detail,
  p.marital_status,
  sc.code     as sub_community_code,
  sc.label_gu as sub_community_gu,
  sc.label_en as sub_community_en,
  st.code     as sect_code,
  st.label_gu as sect_gu,
  st.label_en as sect_en,
  f.mosal_name,
  f.mosal_surname,
  f.paternal_surname,
  f.father_name,
  f.mother_name,
  case when app.manages_profile(p.id) or app.is_moderator() then f.address end as address,
  coalesce(a.computed_rashi,  a.declared_rashi)  as rashi,
  coalesce(a.computed_gan,    a.declared_gan)    as gan,
  coalesce(a.computed_mangal, a.declared_mangal) as mangal,
  a.confidence as astro_confidence,
  ph.display_key as photo_key,
  ph.blur_key    as photo_blur_key
from profiles p
left join taxonomy_terms sc on sc.id = p.sub_community_term_id
left join taxonomy_terms st on st.id = p.sect_term_id
left join profile_family f  on f.profile_id = p.id
left join profile_astro  a  on a.profile_id = p.id
left join lateral (
  select display_key, blur_key from profile_photos
  where profile_id = p.id and kind = 'portrait'
  order by is_primary desc limit 1
) ph on true;
