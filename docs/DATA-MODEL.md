# Data Model

Postgres. Multi-tenant-ready: community-specific taxonomy (sub-communities,
sects) and exogamy rules live in data, never in column names or enums.

All tables carry `id uuid pk default gen_random_uuid()`, `created_at`,
`updated_at` unless noted.

## Tenancy & taxonomy

### `communities`
| column | type | notes |
|---|---|---|
| slug | text unique | `khatri-kshatriya` |
| name_en / name_gu | text | "Khatri Kshatriya" / "ખત્રી ક્ષત્રિય" |
| default_locale | text | `gu` |
| config | jsonb | feature flags, exogamy rule set, required fields |
| is_active | bool | |

### `taxonomy_terms`
Per-community controlled vocabularies. Replaces hardcoded enums.

| column | type | notes |
|---|---|---|
| community_id | uuid fk | |
| kind | text | `sub_community` \| `sect` \| `education_level` \| `occupation_type` \| `diet` |
| code | text | `surti`, `khambhati`, `ahmedabadi`, `indori` / `bhagat`, `jagat` |
| label_en / label_gu | text | |
| sort_order | int | |

Unique on `(community_id, kind, code)`.

Seed for Khatri Kshatriya:
- `sub_community`: surti (સુરતી), khambhati (ખંભાતી), ahmedabadi (અમદાવાદી), indori (ઈન્દોરી)
- `sect`: bhagat (ભગત), jagat (જગત)

## Identity

### `users`
| column | type | notes |
|---|---|---|
| phone_e164 | text unique | login identity |
| display_name | text | |
| locale | text | `gu` \| `en` |
| role | text | `member` \| `moderator` \| `admin` |
| status | text | `pending` \| `active` \| `suspended` |
| community_id | uuid fk | |
| last_seen_at | timestamptz | |

### `profile_managers`
A profile can be managed by more than one user (both parents, or parent + candidate).

| column | type | notes |
|---|---|---|
| profile_id / user_id | uuid fk | |
| relation | text | `self` \| `father` \| `mother` \| `brother` \| `sister` \| `relative` |
| is_primary | bool | |

Unique on `(profile_id, user_id)`.

## The candidate profile

### `profiles`
| column | type | notes |
|---|---|---|
| community_id | uuid fk | |
| public_ref | text unique | short human code, e.g. `KK-1042`, used on shared cards |
| status | text | `draft` \| `pending_review` \| `active` \| `paused` \| `married` \| `withdrawn` \| `rejected` |
| full_name_gu / full_name_en | text | |
| gender | text | `male` \| `female` |
| dob | date | |
| birth_time | time | nullable |
| birth_time_accuracy | text | `exact` \| `approx` \| `unknown` — drives astro confidence |
| birth_place_text | text | "સુરત જનરલ હોસ્પીટલ, સુરત" |
| birth_place_lat / lng | numeric | geocoded |
| birth_place_tz | text | IANA, e.g. `Asia/Kolkata` |
| height_cm | int | canonical; feet/inches is a display concern only |
| marital_status | text | `never_married` \| `divorced` \| `widowed` |
| sub_community_term_id | uuid fk → taxonomy_terms | |
| sect_term_id | uuid fk → taxonomy_terms | Bhagat / Jagat |
| diet_term_id | uuid fk | |
| education_level_term_id | uuid fk | |
| education_detail | text | "B.E. Electrical (A.M.I.E)" |
| occupation_type_term_id | uuid fk | `job` \| `business` \| `professional` \| `student` |
| occupation_detail | text | "Valuation Technical Officer, ICICI Bank (Mortgage Valuation), Vesu branch" |
| employer | text | |
| income_band | text | nullable, optional by design |
| city / state / country | text | |
| about_gu / about_en | text | |
| source | text | `paste_import` \| `form` \| `admin` |

Indexes: `(community_id, status, gender)`, `(dob)`, `(height_cm)`,
`(city)`, `(sub_community_term_id)`, `(sect_term_id)`.

### `profile_family`
1:1 with `profiles`.

| column | type | notes |
|---|---|---|
| father_name | text | |
| mother_name | text | |
| father_occupation / mother_occupation | text | |
| **mosal_name** | text | full maternal-grandfather name as written |
| **mosal_surname** | text | normalised surname — the exogamy key |
| paternal_surname | text | normalised from `full_name_*` |
| native_place | text | |
| brothers_count / sisters_count | int | |
| family_type | text | `joint` \| `nuclear` |
| address | text | **private by default** |

Indexes on `mosal_surname`, `paternal_surname` — both are hard-filter joins.

### `profile_contacts`
Never inlined on the profile. Visibility is enforced at query time.

| column | type | notes |
|---|---|---|
| profile_id | uuid fk | |
| kind | text | `self_mobile` \| `father_mobile` \| `mother_mobile` \| `whatsapp` \| `email` |
| value_e164 | text | |
| label | text | |
| visibility | text | `on_mutual_interest` (default) \| `on_request` \| `community` |
| is_primary | bool | |

### `profile_photos`
| column | type | notes |
|---|---|---|
| kind | text | `portrait` \| `janmakshar` \| `family` |
| storage_key | text | original, never served directly |
| display_key | text | watermarked, resized |
| blur_key | text | served to unapproved viewers |
| visibility | text | `on_approval` (default) \| `community` \| `private` |
| is_primary | bool | |
| ocr_text | text | Phase 2, for janmakshar |

## Astrology

### `profile_astro`
1:1 with `profiles`. Two provenances per field: what the family *declared*
(from the biodata) and what the engine *computed*. Never silently overwrite a
declared value — surface the disagreement.

| column | type | notes |
|---|---|---|
| declared_rashi / computed_rashi | text | |
| declared_nakshatra / computed_nakshatra | text | |
| computed_nakshatra_pada | int | 1–4 |
| declared_gan / computed_gan | text | `dev` \| `manushya` \| `rakshas` |
| computed_nadi | text | `aadi` \| `madhya` \| `antya` |
| computed_yoni / varna / vashya | text | Ashtakoot inputs |
| declared_mangal / computed_mangal | text | `none` (સાદો) \| `low` \| `high` \| `unknown` |
| chart | jsonb | full planetary longitudes from the engine |
| engine_version | text | pinned; recompute on bump |
| computed_at | timestamptz | |
| confidence | text | derived from `birth_time_accuracy` |

## Preferences & exclusions

### `profile_preferences`
| column | type | notes |
|---|---|---|
| age_min / age_max | int | |
| height_min_cm / height_max_cm | int | |
| sub_community_term_ids | uuid[] | empty = no restriction |
| sect_term_ids | uuid[] | |
| education_level_term_ids | uuid[] | |
| cities | text[] | |
| marital_statuses | text[] | |
| manglik_preference | text | `only_manglik` \| `only_non_manglik` \| `either` |
| min_guna | int | typical thresholds: 18 acceptable, 24 good |
| require_astro_match | bool | |
| notes_gu | text | |

### `profile_exclusions`
Manual additions on top of the automatic rules.

| column | type | notes |
|---|---|---|
| kind | text | `mosal_surname` \| `paternal_surname` \| `family` \| `profile` |
| value | text | |
| reason | text | |

## Matching

### `match_scores`
Materialised cache; recomputed on profile or preference change.

| column | type | notes |
|---|---|---|
| a_profile_id / b_profile_id | uuid fk | stored once, `a_id < b_id` |
| hard_blocks | jsonb | `["same_mosal", "sect_mismatch"]` — non-empty = never surface |
| guna_total | int | 0–36 |
| guna_breakdown | jsonb | per-koota points + labels |
| mangal_compatible | bool | |
| preference_score | numeric | 0–1, both directions |
| total_score | numeric | |
| explanation | jsonb | ordered, renderable reason list (principle 4) |
| computed_at | timestamptz | |

## Interaction

### `interests`
| column | type | notes |
|---|---|---|
| from_profile_id / to_profile_id | uuid fk | |
| initiated_by_user_id | uuid fk | which manager sent it |
| status | text | `sent` \| `accepted` \| `declined` \| `withdrawn` \| `expired` |
| message_gu | text | |
| responded_at | timestamptz | |

Contact reveal is derived: `status = 'accepted'` unlocks
`visibility = 'on_mutual_interest'` contacts for both sides. No separate table.

### `photo_access_grants`
| profile_id, granted_to_user_id, granted_by_user_id, expires_at, revoked_at |

### `profile_views`
`profile_id, viewer_user_id, viewed_at` — surfaced to the owner (principle 3).

## Governance

### `profile_reviews`
`profile_id, reviewer_user_id, decision (approve|reject|changes_requested), notes, reviewed_at`

### `reports`
`reporter_user_id, subject_profile_id, reason, detail, status, resolved_by, resolved_at`

### `consents` — DPDP Act 2023
| column | type | notes |
|---|---|---|
| profile_id | uuid fk | |
| kind | text | `listing` \| `photo_display` \| `contact_share` \| `astro_processing` |
| granted_by_user_id | uuid fk | who clicked |
| candidate_confirmed | bool | did the candidate themselves confirm |
| policy_version | text | |
| granted_at / revoked_at | timestamptz | |

### `audit_log`
`actor_user_id, action, subject_type, subject_id, before jsonb, after jsonb, at`

## Import

### `import_jobs`
| column | type | notes |
|---|---|---|
| user_id | uuid fk | |
| raw_text | text | the pasted WhatsApp blob |
| normalised_text | text | after the deterministic pre-pass |
| parsed | jsonb | model output |
| field_confidence | jsonb | per-field, drives which fields get flagged for review |
| model | text | |
| status | text | `pending` \| `parsed` \| `confirmed` \| `failed` |
| profile_id | uuid fk | set on confirm |

Retaining `raw_text` is deliberate: it is the ground-truth corpus for improving
the parser. Purge on profile deletion.
