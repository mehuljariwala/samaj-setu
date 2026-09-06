# Samaj Setu — working notes for Claude

Community matrimonial platform for the Khatri Kshatriya samaj. Currently in
**design phase** — `docs/` is written, no application code yet.

Read `README.md` first, then `docs/PRODUCT.md` and `docs/ARCHITECTURE.md`.

## Decisions already made — don't relitigate

- **Supabase is the backend.** Postgres + Auth (phone OTP) + Storage, and
  authorization via **RLS**, not application-layer checks.
- **Next.js 15** App Router for UI and for any server-side work needing a
  secret or a heavy npm library. **No Supabase Edge Functions** — deliberately
  avoiding a fourth runtime.
- **`astro-svc`**, a small Python FastAPI service with `pyswisseph`, is the only
  other deployable. Guna Milan itself is a Postgres function.
- **Plain SQL migrations via the Supabase CLI. No ORM.** RLS policies, the
  `guna_milan()` function and `pg_cron` schedules are all SQL already; splitting
  the schema across an ORM DSL and raw SQL is worse.
- Single samaj (Khatri Kshatriya) now, but community taxonomy and exogamy rules
  live in `taxonomy_terms` / `communities.config`, never in enums or column names.

## Domain vocabulary — get these right

| Term | Meaning |
|---|---|
| **મોસાળ / mosal** | Maternal grandfather's family. Shared mosal **disqualifies** a match. A hard filter, not a preference. |
| **ભગત / જગત (Bhagat / Jagat)** | Sect division inside the samaj. Many families treat it as a hard filter. |
| **સાદો / મંગળ** | Non-manglik / manglik |
| **દેવ / મનુષ્ય / રાક્ષસ** | Gana, from nakshatra — one of the 8 kootas |
| **જન્માક્ષર** | The paper kundali. Families upload it as a photo. |
| Sub-communities | Surti · Khambhati · Ahmedabadi · Indori |

## Non-negotiables when writing code

1. **RLS policies ship with pgTAP tests.** Every policy gets a test asserting
   what member-A, member-B, a non-member and a moderator can each read. This is
   the highest-value test suite in the project — a privacy layer without tests
   is theatre.
2. **The service-role key never reaches the client.** Server actions only, and
   every use writes to `audit_log`.
3. **Never auto-publish an imported profile.** Parse → human confirm → moderator
   queue.
4. **Never silently overwrite a family's declared astro values** with computed
   ones. Store both, show the disagreement.
5. **Never present precise guna for an unknown birth time.** Suppress or show a
   range; see `docs/ASTRO-MATCHING.md`.
6. **Gujarati first.** Any user-facing string needs a `gu` translation, not just
   `en`. Store `*_gu` and `*_en` for names.
7. Height is stored in cm. Age is always computed from `dob`, never trusted from
   input.

## Privacy posture

Real people's phone numbers, addresses, photos and birth data, frequently
uploaded by a parent on the candidate's behalf. India's DPDP Act 2023 applies.
Capture consent, honour deletion, keep the grievance contact real.

`docs/research/whatsapp-transcript.md` is the source requirements document —
phone numbers and street addresses in it are **redacted**. Keep it that way.
