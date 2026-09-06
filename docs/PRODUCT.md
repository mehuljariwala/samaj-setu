# Samaj Setu — Product Brief

> Working name. Alternatives: Vivah Setu, Shubh Milan, Snehbandhan.

A community-scoped matrimonial platform for the Khatri Kshatriya samaj
(Surti / Khambhati / Ahmedabadi / Indori), built to replace the unstructured
WhatsApp biodata group with a searchable, privacy-respecting directory —
without abandoning WhatsApp as the distribution channel.

## Origin

Requirements were derived from an actual WhatsApp group transcript
(04–05 Sep 2026, "Khatri Kshatriya marriage group", admins Mukesh Pasiyawala,
Umeshbhai, Om, Bhavin Jariwala). Raw source: `docs/research/whatsapp-transcript.md`.

Every finding below is grounded in something a real member said or did.

## Findings from the transcript

| Observed | Problem | Product response |
|---|---|---|
| Two competing biodata formats posted within 40 min of each other (Mukesh's plain field list vs Paresh's emoji-sectioned layout) | No schema; every biodata differs | One canonical structured profile |
| `‎Read more` truncation on nearly every biodata post | Biodatas unreadable in feed | Profile page + generated card image |
| Same biodata reposted 2–3× within hours; format template posted twice | No persistence, feed scrolls away | Permanent searchable directory |
| Admins repeatedly asking outsiders to leave ("બીજા સમાજના વ્યક્તિઓ … લેફ્ટ થઈ જવા વિનંતી") | No access control | Invite + admin approval gate |
| "Only apna Khatri samaj mate j che ke bija koi samaj?" | Eligibility rules undocumented | Explicit sub-community field, shown on every profile |
| "કોઈ દિકરી વાલા મુકશે તો વાત આગળ વધશે" — variants of this posted 3× in one morning | **Severe supply imbalance: ~0 girls' profiles vs several boys'** | Privacy-first defaults aimed at girls' families — the #1 product risk |
| Father's and mother's mobile numbers posted in plaintext to a 200+ member group | Privacy | Contact reveal only on mutual interest |
| "કુંડલી માં સાદો કે મંગળ, રાક્ષસ કે દેવગણ" requested manually per biodata | Astro data collected by hand, inconsistently, often missing | Compute from DOB + birth time + birth place |
| "કોઈપણ જાતની ફી રાખવામાં આવેલી નથી" | Free is a stated community value | No paywall — sponsorship / donation |
| "ધંધાકીય અને ગુડ મોર્નિંગ ના મેસેજ મૂકવા નહીં" | Signal-to-noise | Directory has no feed to spam |

## What makes this not just "Shaadi.com for Khatris"

Two fields in the community's own format have no equivalent on mainstream
matrimonial sites, and both are **hard filters**, not preferences:

- **મોસાળ (mosal)** — the maternal grandfather's family/surname. Shared mosal
  disqualifies a match (maternal-line exogamy). Appears in every version of the
  group's biodata template.
- **ભગત / જગત (Bhagat / Jagat)** — a sect division inside the samaj. Many
  families will only match within their own.

Modelling these as first-class, filterable, exclusion-capable fields is the
core domain advantage.

## The wedge: keep WhatsApp, add structure underneath

The group is the install base, not the competitor. Two features carry adoption:

1. **Paste-to-profile import.** The user pastes their existing biodata blob —
   Gujarati or English, either format — an LLM parses it into structured
   fields, the user confirms. Onboarding goes from a 20-field form to one
   paste. For 55-year-old parents typing Gujarati on Android, this is the
   difference between adoption and death.
2. **Generate-back the biodata card.** Profile → clean PNG/PDF in the group's
   own visual format, one tap to share to WhatsApp. Every share is now
   complete, non-truncated, and links back to the profile.

## Design principles

1. **Parents are the operators.** Every biodata in the transcript was posted by
   a parent. One phone number manages N candidate profiles (a father with two
   daughters). Not a workaround — the primary model.
2. **Gujarati first, English second.** UI defaults to `gu`. Large type, minimal
   typing, no jargon.
3. **Tilt every default toward girls' families.** Photos blurred until the
   profile owner approves the viewer. Contact never public. No browsing without
   an admin-verified account. View log visible to the owner. The growth pitch is
   literally: *unlike the group, nobody gets your daughter's number or photo
   without you saying yes.*
4. **Explain every match.** Families must justify decisions to elders. Show the
   argument — "age +3, both Surti Khatri, both Jagat, guna 28/36, mosal clear,
   both Surat" — never a black-box percentage.
5. **Free.** Sustainability via community sponsorship or donation, never a
   contact-unlock paywall.
6. **Single samaj now, multi-tenant-ready.** Communities, sub-communities,
   sects and exogamy rules live in data, not in the schema. A second samaj is a
   config row, not a rewrite.

## Roadmap

### Phase 0 — MVP
- Phone OTP auth; one user manages N profiles
- **Paste-to-profile import** (Gujarati + English, both group formats)
- Structured profile: personal, education/occupation, family, astro (declared), contact
- Photo + janmakshar upload with visibility controls
- Admin approval queue before a profile goes live
- Browse + filter: gender, age, height, education, city, sub-community, sect
- **Generated biodata card** (PNG + PDF) for WhatsApp sharing
- Interest → accept → contact reveal

### Phase 1 — Matching
- Swiss Ephemeris astro engine: rashi, nakshatra + pada, gan, nadi, mangal dosh
- Ashtakoot Guna Milan (36 points) between any two profiles
- Hard exclusion rules: same mosal, same paternal surname, declared relation,
  sub-community / sect requirements
- Ranked matches with plain-language explanations
- WhatsApp / SMS notifications

### Phase 2 — Scale
- Janmakshar image OCR (many families have only a photo)
- Samaj melava / event registration
- Admin analytics — gender ratio dashboard, funnel, stale profiles
- Multi-samaj tenancy exposed: other Gujarati samaj groups self-onboard

## Known risks

- **Cold start.** 12 boys and 0 girls is worse than useless. Seeding strategy
  matters more than any feature. Plan: recruit 20–30 girls' families first via
  the admins, privacy-guarantee-led, before opening browse.
- **DPDP Act 2023.** Storing photos, phone numbers, addresses and birth data of
  identifiable adults, frequently uploaded by a parent on someone else's
  behalf. Need explicit candidate consent capture, purpose limitation,
  deletion on request, and a named grievance contact. Cheap to build in now,
  expensive to retrofit.
- **Photo misuse.** Watermark on serve, no full-resolution originals exposed,
  revocable access, no hotlinkable URLs.
- **Moderation load.** Approval queue must stay under a few minutes per profile
  or the admins (volunteers) will stop using it.

## Stack decision

Full detail and rationale in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

- **Backend — Supabase.** Postgres, Auth (phone OTP), Storage, and
  authorization via Row Level Security. The privacy guarantee in principle 3 is
  enforced by database policy, not application code.
- **Web** — Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, PWA,
  `next-intl` for `gu` / `en`. Also hosts the server-side work that needs
  secrets or heavy libraries.
- **Astro service** — small Python FastAPI service using `pyswisseph`, because
  Supabase Edge Functions are Deno and the mature ephemeris libraries are
  Python. Guna Milan itself is a Postgres function over stored values.
- **Biodata parsing** — Claude Haiku 4.5 with a strict JSON schema, plus a
  deterministic Gujarati normalisation pre-pass (see `BIODATA-PARSING.md`)
- **Card generation** — Satori + resvg (PNG), `@react-pdf` (PDF)
