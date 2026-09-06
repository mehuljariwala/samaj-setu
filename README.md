# Samaj Setu — સમાજ સેતુ

A community matrimonial platform for the Khatri Kshatriya samaj
(Surti · Khambhati · Ahmedabadi · Indori), built to replace an unstructured
WhatsApp biodata group with a searchable, privacy-respecting directory —
while keeping WhatsApp as the distribution channel.

> Status: **Phase 0 in progress.** Schema + RLS written, web app runs on
> fixtures. See *Current state* below for what is and isn't verified.

## Read these in order

| Doc | What's in it |
|---|---|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Findings from the real WhatsApp group, design principles, roadmap, risks |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Supabase + Next.js + Python astro service; RLS as the authorization layer |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Full Postgres schema, multi-tenant-ready |
| [`docs/BIODATA-PARSING.md`](docs/BIODATA-PARSING.md) | Paste-to-profile import; Gujarati normalisation spec |
| [`docs/ASTRO-MATCHING.md`](docs/ASTRO-MATCHING.md) | Ashtakoot Guna Milan, mangal dosh, mosal exogamy rules |

## The idea in three lines

1. Parents paste their existing WhatsApp biodata; an LLM turns it into a
   structured profile in one step.
2. The profile is searchable, filterable, and matched on the community's own
   rules — mosal exogamy, Bhagat/Jagat, and computed kundali guna.
3. It generates the biodata card back out, so the group keeps working — but
   from clean data, and without anyone's phone number in it.

## Shape of the system

```
Browser (PWA, ગુજરાતી / English)
  │
  ├── supabase-js ────────────► Supabase Postgres
  │                             RLS enforces every visibility rule
  │
  └── Next.js server actions ─► Claude (paste import)
                              ─► sharp (watermark/blur) → Supabase Storage
                              ─► Satori / react-pdf (biodata card)
                              ─► astro-svc (FastAPI + pyswisseph)

pg_cron nightly ──► guna_milan() ──► match_scores
```

## Ground rules baked into the design

- **Free.** The community said so; no contact-unlock paywall, ever.
- **Nobody gets a phone number or photo without the family's explicit consent** —
  enforced by database policy, not application code.
- **Gujarati first.** Defaults to `gu`, large type, minimal typing.
- **Parents are the operators.** One phone number manages several profiles.
- **Single samaj now, multi-tenant-ready.** A second community is a config row.

## Quick start

```bash
cd web
npm install
npm run dev        # http://localhost:3000/gu — runs on fixtures, no Supabase needed
npm test           # 47 parser tests
npm run typecheck
```

With no `NEXT_PUBLIC_SUPABASE_URL` set, the data layer serves the fixtures in
`web/src/lib/fixtures.ts`, so a fresh clone runs immediately. Copy
`web/.env.example` to `web/.env.local` to point it at a real Supabase project.

## Current state

**Verified working**
- Production build passes; 130 kB first-load JS
- 47/47 parser tests green, covering both WhatsApp biodata formats
- Screens render in Gujarati and English: home, browse + filter sheet,
  profile detail, three-step paste import, interests, my-profiles

**Written but not yet executed**
- `supabase/migrations/*` — never applied to a live database
- `supabase/tests/rls_test.sql` — pgTAP suite, needs Docker + Supabase CLI

**Not built yet**
- Auth (phone OTP), real interest/photo-grant mutations, biodata card
  generation, `astro-svc`, moderator queue

## Next steps

1. Install the Supabase CLI, `supabase start`, apply migrations, run
   `supabase test db` — the RLS suite is the gate on everything else.
2. Phone OTP via the Send SMS Hook; begin TRAI DLT registration in parallel.
3. Wire interests and photo grants to real mutations.
4. Biodata card generation (Satori → PNG) for WhatsApp sharing.
