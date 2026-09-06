# Samaj Setu — સમાજ સેતુ

A community matrimonial platform for the Khatri Kshatriya samaj
(Surti · Khambhati · Ahmedabadi · Indori), built to replace an unstructured
WhatsApp biodata group with a searchable, privacy-respecting directory —
while keeping WhatsApp as the distribution channel.

> Status: **design phase.** Docs are written; no application code yet.

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

## Next step

Scaffold: Supabase project + SQL migrations for the core schema, RLS policies
with pgTAP tests, and the Next.js app shell with `gu`/`en` i18n.
