# Architecture

**Decision: Supabase is the backend.** Postgres, Auth, Storage and — most
importantly — authorization all live there. Nothing in `DATA-MODEL.md` changes;
Supabase *is* Postgres.

## Why this is the right call, not just the convenient one

This app's hardest requirement is not a feature, it's a guarantee:
*nobody sees a girl's phone number or photo without her family's consent*
(Product principle 3). Enforcing that in application code means every future
API route, admin script and background job is a chance to leak it.

Row Level Security moves that guarantee into the database. A leak then requires
a bad *policy*, not merely a forgotten `if`. For a community matrimonial app
where trust is the entire product, that is worth building around.

## Runtimes

Three deployables. Resisting a fourth is deliberate.

| Runtime | Hosts | Why it exists |
|---|---|---|
| **Supabase** (managed) | Postgres + RLS, Auth, Storage, `pg_cron`, `pg_net` | Data, identity, authorization, scheduled jobs |
| **Next.js** on Vercel | UI, server actions, route handlers | Anything needing a secret or a heavy npm lib: Claude parsing, image watermarking, card rendering, the Send-SMS hook endpoint |
| **`astro-svc`** (FastAPI) on Fly.io | `pyswisseph` ephemeris | Supabase Edge Functions are Deno; the mature ephemeris libraries are Python |

**No Supabase Edge Functions.** Everything they'd do, a Next.js route handler
already does, in a runtime we're already deploying and already have types for.
One less place to look when something breaks.

## Where each piece of logic lives

```
Browser (PWA, gu/en)
  │
  ├── supabase-js ──────────────► Supabase Postgres
  │   user-scoped reads/writes    RLS enforces every visibility rule
  │   (JWT passed through)
  │
  └── Next.js server actions ───► Supabase (service role, audited)
        ├── paste-import ────────► Claude Haiku 4.5  (needs API key)
        ├── photo upload ────────► sharp: watermark + blur variants → Storage
        ├── biodata card ────────► Satori/resvg → PNG, react-pdf → PDF
        └── astro compute ───────► astro-svc (FastAPI + pyswisseph)

pg_cron (nightly) ──► guna_milan() SQL function ──► match_scores
```

**The astro split is the interesting one.** Ephemeris work happens *once per
profile* in Python — birth data → rashi, nakshatra + pada, gan, nadi, yoni,
varna, vashya, mangal dosh — and the result is stored on `profile_astro`.
Ashtakoot Guna Milan itself is then pure table lookup over those stored values,
so it's implemented as a **Postgres function**. The nightly N×M recompute never
leaves the database. No round trips, no service to keep warm.

## Authorization: RLS policy sketch

Helper functions are `stable security definer` so they don't re-trigger RLS
recursively, and `auth.uid()` is wrapped in a subselect so Postgres hoists it
to an initplan instead of evaluating per row.

```sql
create schema if not exists app;

create or replace function app.manages_profile(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profile_managers pm
    where pm.profile_id = p and pm.user_id = (select auth.uid())
  );
$$;

-- an accepted interest in either direction unlocks the counterpart
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

alter table profile_contacts enable row level security;

create policy contacts_read on profile_contacts for select using (
      app.manages_profile(profile_id)
   or app.is_moderator()
   or (visibility = 'on_mutual_interest' and app.has_accepted_interest(profile_id))
   or (visibility = 'community'          and app.is_verified_member(profile_id))
);
```

Same shape for `profile_photos` (via `photo_access_grants` or accepted
interest), `profiles` (active + same community + viewer verified, plus always
your own), and `interests` (only the two sides plus moderators).

### Non-negotiable: policy tests

A privacy-critical RLS layer without tests is theatre. Every policy gets a test
that authenticates as member-A, member-B, a non-member and a moderator, and
asserts exactly what each can read. pgTAP in a Supabase migration, run in CI.
This is the single highest-value test suite in the project.

## Storage

Three private buckets — `portraits`, `janmakshar`, `family`. Nothing public.

- Originals uploaded server-side; the client never gets a path to them.
- `sharp` produces a watermarked `display` variant and a `blur` variant at
  upload time (Supabase's built-in image transforms resize but don't watermark).
- Reads go through a server action that checks access, then mints a
  short-lived signed URL. No hotlinkable, guessable or permanent URLs.

## Auth

Supabase Auth phone OTP — `signInWithOtp` / `verifyOtp` with `type: 'sms'`.

Supabase ships built-in support for Twilio, MessageBird, Textlocal and Vonage.
**MSG91 is not built in**, so an Indian-priced provider goes through the
[Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook):
Supabase POSTs to an HTTPS endpoint (a Next.js route handler) that calls MSG91,
with a signing secret generated in the dashboard and verified in the handler.

Two things to plan for early:

- **TRAI DLT registration.** India requires DLT-registered sender IDs and
  message templates. This is paperwork with a lead time measured in days to
  weeks — start it before you need it, not when you're ready to launch.
- **SMS cost control.** Default is one OTP per 60s per user, expiring after an
  hour. Turn on CAPTCHA and keep the rate limits tight; OTP endpoints get
  abused. In local dev use `SMS_TEST_OTP` to map fixed codes to test numbers
  and send zero real messages.

WhatsApp OTP is the alternative worth revisiting — the audience lives in
WhatsApp — but it carries Meta Business verification and template approval, so
it's a Phase 1 item, not a launch blocker.

## Migrations & types

Plain SQL via the Supabase CLI. No ORM.

The RLS policies, the `guna_milan()` function and the `pg_cron` schedules are
all SQL; putting the tables in an ORM DSL and everything else in raw SQL just
splits the schema across two languages. `supabase db diff` generates
migrations, `supabase gen types typescript` generates the TS types that
`supabase-js` consumes, and `supabase start` runs the whole stack locally in
Docker so dev matches prod.

## Trade-offs accepted

- **Lock-in is mild.** It's Postgres with some extensions; Supabase can be
  self-hosted, and the schema is portable. Auth and Storage are the sticky bits.
- **RLS has a learning curve and a performance profile.** Helper functions must
  be `stable`, the columns they join on must be indexed, and `explain analyze`
  on the browse query is a recurring chore. The security payoff is worth it.
- **Service-role key never reaches the client.** Server actions only. Any use of
  it writes to `audit_log`.

## Sources

- [Send SMS Hook — Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook)
- [Auth Hooks — Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks)
- [Phone sign-in — Supabase Docs](https://supabase.com/docs/guides/auth/phone-login)
