# Astro Matching

The group asks for this by hand on every biodata —
*"કુંડલી માં સાદો કે મંગળ, રાક્ષસ કે દેવગણ"* — and families currently pay a
Gor Maharaj per prospective match. Automating it is the strongest reason for a
family to use the site instead of the group.

## Split of responsibility

| Step | Where | Frequency |
|---|---|---|
| Birth data → planetary positions → rashi, nakshatra+pada, gan, nadi, yoni, varna, vashya, mangal dosh | `astro-svc` (Python, `pyswisseph`) | Once per profile, on create/edit of birth data |
| Ashtakoot Guna Milan between two profiles | Postgres function `guna_milan()` | N×M, nightly via `pg_cron` + on demand |

Milan is pure table lookup over values already stored on `profile_astro`, so it
never leaves the database. Only the ephemeris needs Python.

## Engine configuration — pin these

- **Sidereal zodiac, Lahiri ayanamsa** (`SIDM_LAHIRI`) — the Indian standard.
  Tropical or a different ayanamsa shifts rashi and nakshatra and produces
  results families will (correctly) reject.
- **Moon-based** nakshatra and rashi.
- Ephemeris files pinned and vendored; record `engine_version` on every row and
  recompute the whole table when it changes.
- Validate against a set of known charts with published results before trusting
  a single output.

## Ashtakoot — the 36 points

| # | Koota | Max | Derived from | Measures |
|---|---|---|---|---|
| 1 | Varna (વર્ણ) | 1 | Moon rashi | Spiritual compatibility |
| 2 | Vashya (વશ્ય) | 2 | Moon rashi | Mutual influence |
| 3 | Tara / Dina (તારા) | 3 | Nakshatra | Health, fortune |
| 4 | Yoni (યોનિ) | 4 | Nakshatra | Physical compatibility |
| 5 | Graha Maitri (ગ્રહ મૈત્રી) | 5 | Rashi lords | Mental compatibility |
| 6 | Gana (ગણ) | 6 | Nakshatra | Temperament |
| 7 | Bhakoot (ભકૂટ) | 7 | Moon rashi | Prosperity, family welfare |
| 8 | Nadi (નાડી) | 8 | Nakshatra | Health, progeny |
| | **Total** | **36** | | |

Conventional reading of the total: below 18 not advised, 18–24 acceptable,
25–32 good, 33–36 excellent. Store the number; let the family set their own
threshold via `preferences.min_guna`.

**Gana** is the `દેવ / મનુષ્ય / રાક્ષસ` the group asks about — Dev–Dev and
Manushya–Manushya score full, Dev–Rakshas scores zero.

**Nadi** (આદિ / મધ્ય / અંત્ય) carries the most weight at 8 points and scores
zero when both sides share a nadi — Nadi dosh, treated as serious. Flag it
explicitly rather than burying it in the total.

**Mangal dosh** — the `સાદો કે મંગળ` question. Mars in houses 1, 2, 4, 7, 8 or
12 from lagna, moon or Venus, with the usual cancellation rules. Reported
separately from the 36, as `none` / `low` / `high`, with compatibility resolved
as: both manglik → fine, neither → fine, one only → flag.

## Lookup tables (Postgres, seeded)

- `nakshatras` — 27 rows: name_en, name_gu, lord, gana, nadi, yoni, varna
- `rashis` — 12 rows: name_en, name_gu, lord, varna, vashya
- `koota_yoni`, `koota_graha_maitri`, `koota_vashya`, `koota_gana` — score matrices
- Tara and Bhakoot are computed by counting positions, not looked up

Seeding these as data rather than code means they're inspectable, diffable, and
correctable by someone who knows jyotish but not TypeScript.

## Birth-time accuracy drives confidence

`profiles.birth_time_accuracy` propagates to `profile_astro.confidence`:

| Accuracy | What's reliable |
|---|---|
| `exact` | Everything, including nakshatra pada |
| `approx` (±few hours) | Rashi and nakshatra usually; pada unreliable |
| `unknown` (date only) | Rashi usually — the Moon holds a sign ~2¼ days. Nakshatra is ±1, since the Moon crosses one roughly every 24h |

With `unknown`, surface guna as a range or suppress it entirely rather than
presenting a precise wrong number. Low-confidence astro is worse than none —
it will be screenshotted and forwarded as fact.

## Declared vs computed

Families arrive with values from their existing janmakshar. `profile_astro`
stores both (`declared_*` and `computed_*`). **Never silently overwrite a
declared value.** On disagreement, show both and let the family decide which is
authoritative — their paper kundali usually came from a family astrologer and
carries more social weight than our number, whatever the ephemeris says.

## Hard exclusions — community rules, not astrology

These run *before* scoring, in `match_scores.hard_blocks`. A profile with any
hard block is never surfaced, regardless of guna.

| Block | Rule |
|---|---|
| `same_mosal` | `profile_family.mosal_surname` matches — maternal-line exogamy |
| `same_surname` | `paternal_surname` matches |
| `manual_exclusion` | Present in `profile_exclusions` either way |
| `sect_mismatch` | Bhagat / Jagat, when either side requires it |
| `sub_community_mismatch` | When either side restricts it |
| `same_gender` | |
| `not_active` | Either profile not `active` |

Mosal and surname exclusion is the community-specific logic no mainstream
matrimonial site implements. Get it right and get it visible — showing
"મોસાળ clear" on a match card is reassurance a family can act on.

## Presenting results

Per Product principle 4, every match card renders an ordered, plain-Gujarati
reason list, not a percentage:

> ગુણ મેળાપ: ૨૮/૩૬ · બંને સાદો (મંગળ નથી) · નાડી અલગ · ગણ: દેવ–મનુષ્ય ·
> મોસાળ અલગ · બંને સુરતી ખત્રી, જગત · ઉંમર તફાવત ૩ વર્ષ

And a standing caveat in the UI: this is computed information to start a
conversation with your astrologer, not a replacement for one. It protects the
families and it protects you.
