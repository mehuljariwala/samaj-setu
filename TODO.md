# Pending work

Audited 2026-09-06 against the working tree. Grouped by what blocks what.

Legend: **P0** blocks anything real · **P1** blocks public launch · **P2** after launch

---

## Already done

- Product brief, architecture, data model, parsing spec, astro spec (`docs/`)
- Full Postgres schema + RLS policies + pgTAP suite — **written, never executed**
- Next.js app, 6,098 lines: home, browse, profile detail, 6-step form, login, interests, my-profiles
- Gujarati/English throughout, light teal theme, desktop + two-up mobile
- Biodata parser for both WhatsApp formats — **47 tests passing**, the only genuinely finished subsystem
- 11 browse filters + 4 sort orders, verified against fixtures
- Illustrated portraits, hero, footer

---

## P0 — nothing works without these

> **Current blocker:** the database is live and correct, and that is exactly
> why the app now shows nothing. Every policy requires an authenticated
> `app_users` row, so the anon key reads zero profiles, zero contacts, even
> zero taxonomy. Real auth (item 4) is now the single gate on everything else.

### 1. Stand up the database — ✅ DONE 2026-09-06
- [x] Supabase project `fpdzrogmnnvibqsimlxp`
- [x] All three migrations applied — 22 tables, RLS on 22/22, 37 policies
- [x] Taxonomy seeded (4 sub-communities, 2 sects, 4 diets, 6 education, 5 occupation)
- [x] Reference data: 27 nakshatras, 12 rashis
- [x] 15 `app.*` helper functions + `v_profile_card`
- [x] `web/.env.local` written (gitignored)
- [x] 8 demo profiles seeded — `supabase/seed/demo_profiles.sql`
- [ ] Generate types: `supabase gen types typescript`
- [ ] **Rotate the service_role key and secret key** — both were pasted into a chat transcript

### 2. Run the RLS suite — ✅ DONE 2026-09-06, 16/16 pass
- [x] Ran via `psql -f supabase/tests/rls_test.sql` against the live database
- [x] Fixed two harness bugs: `authenticated` has no USAGE on a private schema,
      and cannot `SET ROLE postgres` back. Now uses `set local role` / `reset role`.
- [x] Verified: anon sees nothing · unverified members cannot browse · sent
      interest does NOT unlock a number · accepted interest unlocks both ways ·
      an uninvolved third party stays locked out · photo grants revoke instantly ·
      preferences stay private · moderators see the review queue
- [ ] Re-run in CI on every migration

### 3. Build the write path — the largest remaining chunk
There are currently **zero** database writes in the codebase. `grep '\.insert('` returns nothing.

- [ ] Profile submit. `ProfileForm.goNext()` at `STEP_COUNT` calls `setDone(true)` and shows the celebration. Nothing is saved. Needs: insert `profiles` + `profile_family` + `profile_contacts` + `profile_astro` + `profile_managers` + `consents`, in one transaction, status `pending_review`.
- [ ] `import_jobs` — persist the raw paste (the parser's future training corpus)
- [ ] Send interest (`profile/[ref]` primary CTA)
- [ ] Accept / decline interest (`/interests` is an empty state only)
- [ ] Shortlist heart (`ProfileCardItem`)
- [ ] Request photo access → `photo_access_grants`
- [ ] Report a profile → `reports`
- [ ] Share biodata card (2 buttons, both inert)
- [ ] `/me` — list, edit, pause, withdraw your own profiles

### 4. Real authentication
- [ ] Replace `lib/auth.ts` — currently localStorage with OTP hardcoded to `123456`; **anyone can sign in as anyone**
- [ ] Supabase Auth `signInWithOtp` / `verifyOtp`
- [ ] Send SMS Hook → MSG91 (Next.js route handler + signing-secret verification)
- [ ] Wire `handle_new_user` trigger through to a real `app_users` row
- [ ] Rate limiting + CAPTCHA on the OTP endpoint (SMS cost abuse)
- [ ] Server-side route protection — `AuthGate` is client-side and protects the experience, not the data

---

## P1 — blocks a public launch

### 5. TRAI DLT registration — start this first, it is the long pole
- [ ] Register the entity, sender ID and message templates
- [ ] Days-to-weeks of external lead time. **No SMS OTP in India without it.**
- [ ] Independent of all engineering work — begin immediately

### 6. DPDP Act 2023
- [ ] Privacy policy page — currently a plain label in the footer, not a link
- [ ] Terms page
- [ ] Named grievance officer + contact
- [ ] Consent capture already modelled (`consents` table) but never written to
- [ ] Deletion-on-request flow
- Storing photos, phone numbers, addresses and birth data of identifiable people with no published notice is real legal exposure.

### 7. Moderator queue
- [ ] `/admin` — review, approve, reject, request changes
- [ ] Writes `profile_reviews`, flips `profiles.status` to `active`
- [ ] Report triage
- [ ] Without this nothing ever reaches `active`, so nothing is browsable even once submissions save

### 8. Photos
- [ ] Supabase Storage buckets (`portraits`, `janmakshar`, `family`), all private
- [ ] Upload via server action
- [ ] `sharp`: watermarked display variant + blur variant
- [ ] Signed short-lived URLs; no permanent or guessable paths
- [ ] Janmakshar upload (families have the paper horoscope as a photo)

### 9. Production hygiene
- [ ] Deploy target + CI (build, typecheck, tests, `supabase test db`)
- [ ] Error monitoring
- [ ] Backups verified
- [ ] Real PWA icons — `manifest.webmanifest` has `"icons": []`
- [ ] Seed real taxonomy/cities rather than fixture data

---

## P2 — after launch

- [ ] `astro-svc` (FastAPI + `pyswisseph`) — pin a Python 3.12 venv, wheels lag new releases
- [ ] Ashtakoot Guna Milan: the koota scoring matrices are deliberately **not** seeded pending review by someone jyotish-literate. Gan and Nadi are done.
- [ ] `match_scores` population + nightly `pg_cron` recompute
- [ ] Match explanations on cards
- [ ] Biodata card generation (Satori → PNG) for WhatsApp sharing — this is half the distribution strategy
- [ ] Janmakshar OCR
- [ ] WhatsApp notifications (Meta Business verification required)
- [ ] Real photography to replace the illustrated portraits
- [ ] Admin analytics — gender-ratio dashboard
- [ ] Multi-samaj tenancy exposed

---

## Not an engineering task, and the biggest risk

- [ ] **Seeding.** In the source WhatsApp group the admins asked three separate times for daughters' biodatas and received none. 12 boys and 0 girls is worse than useless.
- [ ] Recruit ~25 girls' families first, privacy-guarantee-led, before opening browse
- [ ] Get Mukesh / Umeshbhai / Om bought in as moderators — they are the distribution

---

## Suggested order

1. TRAI DLT registration (external clock starts now)
2. Deploy the fixture build as a demo, with a "nothing is saved" banner — get samaj feedback before building three weeks of persistence
3. Supabase project + migrations + **RLS suite green**
4. Real auth
5. Write path
6. Moderator queue
7. Photos
8. Legal pages
9. Pilot with the seeded families

Rough estimate to a genuine pilot: **2–3 weeks of focused work**, with DLT in parallel.
