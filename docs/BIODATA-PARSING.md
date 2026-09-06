# Paste-to-Profile Import

The onboarding wedge (Product principle: parents are the operators). User
pastes their existing WhatsApp biodata blob; we return a filled-in form for
confirmation. Target: **one paste, under 60 seconds to a submitted profile.**

Three stages. The LLM only does the part that genuinely needs judgement.

```
raw paste ─► 1. deterministic normalise ─► 2. LLM extract ─► 3. validate & derive ─► confirm UI
```

## Stage 1 — Deterministic normalisation (no model)

Cheap, testable, and it removes most of what confuses the model.

**Strip:**
- WhatsApp export prefixes — `[04/09/26, 10:01:02 PM] ~ Mukesh Pasiyawala: `
- The literal `Read more` truncation marker (preceded by U+200E LRM)
- Emoji section headers — `👤 વ્યક્તિગત વિગત`, `🎓 શિક્ષણ અને વ્યવસાય`,
  `👨‍👩‍👦 પરિવારની વિગત`, `📍 સંપર્ક અને સરનામું`, `🌸`, `🧿`
- Rule separators — `━──────────────────━`, `---`
- Bullet prefixes — `•`, `-`, `*`, including the U+2060 word-joiner padding
  WhatsApp inserts (`•⁠  ⁠`)
- Invisible marks — U+200E, U+200F, U+2060, U+FEFF, U+00A0 → space

**Convert:**

Gujarati digits are a straight codepoint map:

| ૦ | ૧ | ૨ | ૩ | ૪ | ૫ | ૬ | ૭ | ૮ | ૯ |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |

So `૨૯‐૦૯‐૧૯૯૫` → `29-09-1995`. Note the separator is U+2010 HYPHEN, not
ASCII `-`; normalise all dash variants.

**Label aliasing.** Both formats seen in the group, plus English variants, map
to one canonical key:

| Canonical | Seen as |
|---|---|
| `name` | છોકરાનું નામ, છોકરીનું નામ, છોકરા / છોકરીનું નામ, નામ, Name |
| `father_name` | પિતા નું નામ, પિતાનું નામ, Father's Name |
| `mother_name` | માતાનું નામ, Mother's Name |
| `mosal` | મોસાળ, Mosal |
| `dob` | જન્મ તારીખ, Date of Birth, DOB |
| `birth_time` | જન્મ સમય, Birth Time |
| `rashi` | રાશિ, Rashi |
| `age` | ઉંમર, Age |
| `birth_place` | જન્મ સ્થળ, Birth Place |
| `education` | અભ્યાસ, Study, Education |
| `height` | ઊંચાઈ, Height |
| `sect` | ભગત /જગત, ભગત / જગત, Bhagat / Jagat |
| `occupation` | વ્યવસાય ફિલ્ડ સાથે, મુખ્ય વ્યવસાય, Occupation |
| `contact` | પિતાનો મોબાઈલ નંબર, માતાનો મો. નંબર, Mobile No., Contact |
| `address` | સરનામું, Address |
| `sub_community` | Community, સમાજ |
| `marital_status` | Marital Status |

Keep this table in `lib/import/labels.ts`, data-driven — new aliases will keep
appearing and shouldn't need a code change.

## Stage 2 — LLM extraction

Claude Haiku 4.5, strict JSON schema, temperature 0. Input is the normalised
text; output is the profile shape plus a per-field confidence.

Rules given to the model:
- **Never invent.** Missing field → `null`, not a guess.
- Preserve the Gujarati original *and* a romanised form for every name field.
  `full_name_gu` and `full_name_en` are both stored.
- `occupation_detail` keeps the whole descriptive string — the group's format
  is literally "વ્યવસાય **ફિલ્ડ સાથે**" (occupation *with field*), and
  "ICICI Bank માં વેલ્યુએશન ટેક્નિકલ ઓફિસર (મોર્ટગેજ વેલ્યુએશન ગ્રુપ), વેસુ બ્રાન્ચ"
  is more useful whole than chopped into columns.
- Infer `gender` from the label used (છોકરાનું = male, છોકરીનું = female) or an
  explicit Gender field. If neither, `null` — do not guess from the name.
- Emit `field_confidence` per field; anything below threshold gets highlighted
  in the confirm UI.

## Stage 3 — Validation and derivation

Deterministic again. This is where the messy real-world cases get caught.

**Time of day.** Gujarati qualifiers, applied to a 12-hour clock:

| Word | Meaning | Maps to |
|---|---|---|
| સવારે | morning | 04:00–11:59 |
| બપોરે | afternoon | 12:00–15:59 |
| સાંજે | evening | 16:00–19:59 |
| રાત્રે | night | 20:00–03:59 |

`સવારે ૬:૦૦` → `06:00`. But `૧૦:૪૬ (સાંજે)` — from a real profile in the group
— is contradictory: 10:46 "evening" is most likely 22:46, which would normally
be રાત્રે. **Resolve to 22:46 but set `birth_time_accuracy = 'approx'` and ask
the user to confirm.** Birth time drives the entire astro chart; a silent
12-hour error produces a confidently wrong kundali. Never guess quietly here.

**Height.** `૫'ફુટ ૫"ઇંચ`, `5'ft 2"inch`, `૫'૬`, `5'6"`, `5.6` (means 5'6",
not 5.6 feet) → `height_cm`. Store cm; render feet/inches.

**Age.** Always compute from `dob`. If the stated age differs by more than one
year, flag it; a one-year gap is normal (Indian "running age" convention) and
should be accepted silently.

**Phones.** `+૯૧ ૯૮૨૫૧૦૫૫૪૧/+૯૧ ૮૪૬૯૬૪૬૨૮૪` → two rows in `profile_contacts`,
each E.164, each tagged with the right `kind` from the label
(પિતાનો → `father_mobile`, માતાનો → `mother_mobile`). Slash- and
comma-separated lists are common.

**Taxonomy resolution.** `sect` and `sub_community` strings resolve against
`taxonomy_terms` for the community. Unmatched → `null` + prompt. Do not
create terms from user input.

**Birth place.** Geocode `birth_place_text` → lat/lng/tz. Free-text like
"સુરત જનરલ હોસ્પીટલ સુરત" geocodes fine to Surat; city-level precision is
sufficient for nakshatra.

## Confirm UI

- Never auto-publish. Parsed → `import_jobs.status = 'parsed'` → user reviews.
- Low-confidence and derived-with-ambiguity fields (birth time especially) are
  visually flagged and focused first.
- Missing required fields block submission; missing optional ones don't.
- On confirm: create `profiles` + children, set `status = 'pending_review'` for
  the moderator queue.

## Testing

Golden-file tests over real pastes. Seed corpus from the transcript:
Mukesh's blank template, Paresh's emoji format (posted twice, once truncated),
Umeshbhai's full Gujarati profile, Punit's all-English profile, and Binita's
truncated English one. Each gets an expected-JSON fixture.

`import_jobs.raw_text` is retained precisely to grow this corpus — every real
paste that parses badly becomes a test case. Purge on profile deletion.
