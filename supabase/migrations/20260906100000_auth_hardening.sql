-- Auth bootstrap + two privilege-escalation fixes.
--
-- Postgres RLS filters ROWS, not COLUMNS. Both `app_users_update_self` and
-- `profiles_update` correctly restrict *which row* you may touch and then
-- silently allow you to write *any column in it*. That meant:
--
--   update app_users set role = 'admin'  where id = auth.uid();   -- worked
--   update profiles   set status = 'active' where id = <mine>;    -- worked,
--                                                bypassing moderation entirely
--
-- Neither is reachable through our UI, but RLS is the boundary precisely
-- because the UI is not.

-- ------------------------------------------------------- app_users columns
--
-- Column-level grants are the right tool here: nothing else in the product
-- needs a member to write these fields.

revoke update on app_users from authenticated;
grant update (display_name, locale, last_seen_at) on app_users to authenticated;

-- Moderators still need a way to admit members. A SECURITY DEFINER function
-- gives them exactly that one capability and nothing more.
create or replace function app.set_member_status(target uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_moderator() then
    raise exception 'only a moderator may change member status'
      using errcode = 'insufficient_privilege';
  end if;
  if new_status not in ('pending', 'active', 'suspended') then
    raise exception 'invalid status %', new_status using errcode = 'check_violation';
  end if;

  update app_users set status = new_status where id = target;
end;
$$;

revoke all on function app.set_member_status(uuid, text) from public;
grant execute on function app.set_member_status(uuid, text) to authenticated;

-- --------------------------------------------------- profiles transitions
--
-- Column grants can't help here: moderators and members share the
-- `authenticated` role, so the rule has to be about *which transition*, not
-- which column. A family may pause, withdraw or mark married; only a
-- moderator may publish.

create or replace function app.guard_profile_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Identity columns are never writable by anyone through the API.
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

drop trigger if exists t_profiles_guard_transition on profiles;
create trigger t_profiles_guard_transition
  before update on profiles
  for each row execute function app.guard_profile_transition();

-- ------------------------------------------------------------- auth signup
--
-- Mirrors auth.users into app_users. `auto_activate_members` decides whether
-- a verified phone can browse immediately or waits for a moderator; it is a
-- per-community setting so the samaj can tighten it without a deploy.

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_community uuid;
  v_auto      boolean;
begin
  select c.id, coalesce((c.config->>'auto_activate_members')::boolean, false)
    into v_community, v_auto
  from communities c
  where c.slug = 'khatri-kshatriya';

  insert into app_users (id, phone_e164, community_id, status, display_name)
  values (
    new.id,
    new.phone,
    v_community,
    case when v_auto then 'active' else 'pending' end,
    nullif(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do update
    set phone_e164 = coalesce(excluded.phone_e164, app_users.phone_e164);

  return new;
end;
$$;

-- Pilot posture: a verified phone can browse straight away, because at this
-- scale the real gate is who receives the invite link. Flip to false once the
-- moderator queue exists and the group is open enough to need it.
update communities
set config = config || jsonb_build_object('auto_activate_members', true)
where slug = 'khatri-kshatriya';
