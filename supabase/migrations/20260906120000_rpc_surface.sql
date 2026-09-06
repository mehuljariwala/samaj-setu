-- Public wrappers for the write path.
--
-- PostgREST only exposes `public` and `graphql_public`. Rather than publish
-- the whole internal `app` schema, each callable operation gets a thin,
-- explicitly-granted wrapper. That keeps the API surface a deliberate list.

create or replace function public.submit_profile(payload jsonb)
returns text language sql volatile security invoker set search_path = public as $$
  select app.submit_profile(payload);
$$;

create or replace function public.send_interest(
  to_profile uuid,
  from_profile uuid default null,
  message text default null
)
returns uuid language sql volatile security invoker set search_path = public as $$
  select app.send_interest(to_profile, from_profile, message);
$$;

create or replace function public.set_member_status(target uuid, new_status text)
returns void language sql volatile security invoker set search_path = public as $$
  select app.set_member_status(target, new_status);
$$;

revoke all on function public.submit_profile(jsonb) from public;
revoke all on function public.send_interest(uuid, uuid, text) from public;
revoke all on function public.set_member_status(uuid, text) from public;

grant execute on function public.submit_profile(jsonb) to authenticated;
grant execute on function public.send_interest(uuid, uuid, text) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;

-- The wrappers are SECURITY INVOKER on purpose, so RLS still applies inside
-- `app.send_interest`. That means the caller needs USAGE on the schema.
--
-- Safe to grant: every function in `app` either self-checks the caller
-- (submit_profile, set_member_status), is read-only about the caller
-- (can_browse, manages_profile, …), is pure (last_token, gan_koota), or is a
-- trigger function that cannot be invoked directly.
grant usage on schema app to authenticated;
