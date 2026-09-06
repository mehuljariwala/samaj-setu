import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ageFromDob,
  extractFields,
  gujaratiDigitsToLatin,
  normalise,
  parseBiodata,
  parseBirthTime,
  parseDob,
  parseHeightToCm,
  parsePhones,
  surnameOf,
} from './normalise.ts'

/**
 * Fixtures reproduce the exact formatting quirks of the source WhatsApp group
 * — Gujarati digits, U+2010 hyphens, emoji section headers, the U+2060-padded
 * bullets WhatsApp inserts, and the `Read more` truncation marker. Names and
 * numbers are invented; the formatting is not.
 */

const TEMPLATE_A = `છોકરાનું નામ: અંકિત દિનેશભાઈ સોનવાલા
પિતા નું નામ: દિનેશભાઈ મગનલાલ સોનવાલા
માતાનું નામ: ભારતી દિનેશભાઈ સોનવાલા
મોસાળ: રમેશચંદ્ર જયંતિલાલ ટોપીવાલા
જન્મ તારીખ: ૨૩/૧૧/૧૯૯૭
જન્મ સમય: સવારે ૬:૦૦ વાગ્યે
ઉંમર: ૨૮ વર્ષ
જન્મ સ્થળ: સુરત
અભ્યાસ: બી.ઈ. સિવિલ એન્જીનિયર
ઊંચાઈ: ૫'૬
ભગત/જગત: જગત
વ્યવસાય ફિલ્ડ સાથે: ICICI Bank માં વેલ્યુએશન ટેક્નિકલ ઓફિસર, વેસુ બ્રાન્ચ
પિતાનો મોબાઈલ નંબર: 9876543210/9123456780
સરનામું: પ્લોટ નંબર: ૦૬, શિવાલિક નિવાસમ, સુરત.`

const TEMPLATE_B = `[04/09/26, 10:39:33 PM] ~ SOME SENDER: 🌸 લગ્ન માટે બાયોડેટા (Marriage Biodata) 🌸
━──────────────────━
👤 વ્યક્તિગત વિગત (Personal Details)
•⁠  ⁠નામ:-કેવલ પ્રવીણભાઈ ઘડિયાળી
•⁠  ⁠જન્મ તારીખ:-૨૯‐૦૯‐૧૯૯૫
•⁠  ⁠જન્મ સમય:-૧૦:૪૬ (સાંજે)
•⁠  ⁠ઉંમર:- ૩૧ વર્ષ
•⁠  ⁠ઊંચાઈ:- ૫'ફુટ ૫"ઇંચ
•⁠  ⁠જન્મ સ્થળ:-સુરત જનરલ હોસ્પીટલ સુરત
•⁠  ⁠ભગત / જગત: ભગત

🎓 શિક્ષણ અને વ્યવસાય (Education & Profession)
•⁠  ⁠અભ્યાસ: B.E. Electrical (A.M.I.E)
•⁠  ⁠મુખ્ય વ્યવસાય:-  (જી.એન.એફ.સી ભરૂચ)

👨‍👩‍👦 પરિવારની વિગત (Family Details)
•⁠  ⁠પિતાનું નામ:-પ્રવીણભાઈ નટવરલાલ ઘડિયાળી
•⁠  ⁠માતાનું નામ:-ઉષા પ્રવીણભાઈ ઘડિયાળી
•⁠  ⁠મોસાળ:-કિશોરચંદ્ર જેકીશનદાસ મોતીવાલા

📍 સંપર્ક અને સરનામું (Contact Details)
•⁠  ⁠માતાનો મો. નંબર:‐+૯૧ ૯૮૨૫૧૦૫૫૪૧/+૯૧ ૮૪૬૯૬૪૬૨૮૪
‎Read more`

const TEMPLATE_ENGLISH = `🌸 Marriage Biodata 🌸

👤 Personal Details
•⁠  ⁠Name: Rutvik Ranjitbhai Chunawala
•⁠  ⁠Date of Birth: 28/05/1996
•⁠  ⁠Age:- 30 years
•⁠  ⁠Height:- 5'ft 2"inch
•⁠  ⁠Bhagat / Jagat: Jagat

🎓 Education & Profession
•⁠  ⁠Study: F.Y. B.com
•⁠  ⁠Occupation: Event organization

👨‍👩‍👦 Family Details
•⁠  ⁠Father's Name: Ranjitbhai Bhagwandas Chunawala
•⁠  ⁠Mother's Name: Kiran Ranjitbhai Chunawala
•⁠  ⁠Mosal : Bhupendra Natwarlal Vasanwala

📍 Contact and Address
•⁠  ⁠Mobile No. 9574368103`

describe('gujaratiDigitsToLatin', () => {
  it('maps the full digit range', () => {
    assert.equal(gujaratiDigitsToLatin('૦૧૨૩૪૫૬૭૮૯'), '0123456789')
  })
  it('leaves Gujarati letters untouched', () => {
    assert.equal(gujaratiDigitsToLatin('સુરત ૪૦૦'), 'સુરત 400')
  })
})

describe('normalise', () => {
  it('strips the WhatsApp export line prefix', () => {
    assert.ok(!normalise(TEMPLATE_B).includes('[04/09/26'))
    assert.ok(!normalise(TEMPLATE_B).includes('SOME SENDER'))
  })

  it('strips emoji headers, rules, bullets and the Read more marker', () => {
    const out = normalise(TEMPLATE_B)
    assert.ok(!out.includes('🌸'))
    assert.ok(!out.includes('━'))
    assert.ok(!out.includes('•'))
    assert.ok(!/Read more/i.test(out))
  })

  it('removes invisible marks WhatsApp inserts', () => {
    // U+200E LRM, U+2060 word joiner
    assert.ok(!/[‎⁠﻿]/.test(normalise(TEMPLATE_B)))
  })

  it('folds U+2010 and friends to ASCII hyphen', () => {
    assert.ok(normalise('૨૯‐૦૯‐૧૯૯૫').includes('-'))
    assert.ok(!normalise('૨૯‐૦૯‐૧૯૯૫').includes('‐'))
  })

  it('is idempotent', () => {
    const once = normalise(TEMPLATE_B)
    assert.equal(normalise(once), once)
  })
})

describe('parseHeightToCm', () => {
  const cases: Array<[string, number]> = [
    ["૫'ફુટ ૫\"ઇંચ", 165],
    ['5\'ft 2"inch', 157],
    ["૫'૬", 168],
    ['5\'6"', 168],
    ['5 feet 6 inch', 168],
    ['5.6', 168],
    ['168 cm', 168],
  ]
  for (const [input, expected] of cases) {
    it(`parses ${input} to ${expected}cm`, () => {
      assert.equal(parseHeightToCm(input), expected)
    })
  }

  it('rejects an implausible feet value rather than guessing', () => {
    assert.equal(parseHeightToCm('12'), null)
  })
})

describe('parseBirthTime', () => {
  it('applies સવારે as AM', () => {
    assert.deepEqual(parseBirthTime('સવારે ૬:૦૦ વાગ્યે'), {
      time: '06:00',
      accuracy: 'exact',
      note: undefined,
    })
  })

  it('applies રાત્રે as PM', () => {
    assert.equal(parseBirthTime('રાત્રે ૯:૩૦').time, '21:30')
  })

  // The real case from the group: "10:46 evening" is self-contradictory.
  // Resolving it silently would produce a confidently wrong kundali.
  it('flags a period conflict instead of resolving it silently', () => {
    const r = parseBirthTime('૧૦:૪૬ (સાંજે)')
    assert.equal(r.time, '22:46')
    assert.equal(r.accuracy, 'approx')
    assert.equal(r.note, 'period_conflict')
  })

  it('marks a bare 12-hour time as approximate', () => {
    const r = parseBirthTime('૭:૧૫')
    assert.equal(r.accuracy, 'approx')
    assert.equal(r.note, 'am_pm_missing')
  })

  it('returns unknown when there is no time at all', () => {
    assert.deepEqual(parseBirthTime('ખબર નથી'), { time: null, accuracy: 'unknown' })
  })
})

describe('parseDob', () => {
  it('reads Gujarati digits with U+2010 separators', () => {
    assert.equal(parseDob('૨૯‐૦૯‐૧૯૯૫'), '1995-09-29')
  })
  it('reads day-first slash dates', () => {
    assert.equal(parseDob('23/11/1997'), '1997-11-23')
  })
  it('rejects an impossible date', () => {
    assert.equal(parseDob('45/13/1990'), null)
  })
})

describe('ageFromDob', () => {
  const now = new Date('2026-09-06T00:00:00Z')
  it('counts a birthday later this year as not yet reached', () => {
    assert.equal(ageFromDob('1995-09-29', now), 30)
  })
  it('counts a birthday already passed', () => {
    assert.equal(ageFromDob('1996-05-28', now), 30)
  })
})

describe('parsePhones', () => {
  it('splits a slash-separated pair of Gujarati-digit numbers', () => {
    assert.deepEqual(parsePhones('+૯૧ ૯૮૨૫૧૦૫૫૪૧/+૯૧ ૮૪૬૯૬૪૬૨૮૪'), [
      '+919825105541',
      '+918469646284',
    ])
  })
  it('normalises a bare 10-digit number to E.164', () => {
    assert.deepEqual(parsePhones('9574368103'), ['+919574368103'])
  })
  it('drops a number that cannot be an Indian mobile', () => {
    assert.deepEqual(parsePhones('12345'), [])
  })
})

describe('extractFields', () => {
  it('prefers the longest matching label', () => {
    const f = extractFields(normalise('પિતાનો મોબાઈલ નંબર: 9876543210'))
    assert.equal(f.contact, '9876543210')
  })

  it('infers gender from which name label was used', () => {
    assert.equal(extractFields(normalise('છોકરાનું નામ: ક')).gender, 'male')
    assert.equal(extractFields(normalise('છોકરીનું નામ: ક')).gender, 'female')
  })

  it('handles the :- separator used in Template B', () => {
    assert.equal(extractFields(normalise('•⁠  ⁠નામ:-કેવલ')).name, 'કેવલ')
  })
})

describe('surnameOf', () => {
  it('takes the last token', () => {
    assert.equal(surnameOf('રમેશચંદ્ર જયંતિલાલ ટોપીવાલા'), 'ટોપીવાલા')
  })
  it('returns null for a single-token name', () => {
    assert.equal(surnameOf('રમેશ'), null)
  })
})

describe('parseBiodata — Template A (admin format, Gujarati)', () => {
  const p = parseBiodata(TEMPLATE_A, new Date('2026-09-06T00:00:00Z'))

  it('extracts identity and family', () => {
    assert.equal(p.fullNameGu, 'અંકિત દિનેશભાઈ સોનવાલા')
    assert.equal(p.gender, 'male')
    assert.equal(p.fatherName, 'દિનેશભાઈ મગનલાલ સોનવાલા')
    assert.equal(p.mosalName, 'રમેશચંદ્ર જયંતિલાલ ટોપીવાલા')
  })

  it('derives both exogamy keys', () => {
    assert.equal(p.mosalSurname, 'ટોપીવાલા')
    assert.equal(p.paternalSurname, 'સોનવાલા')
  })

  it('derives date, time, height and age', () => {
    assert.equal(p.dob, '1997-11-23')
    assert.equal(p.birthTime, '06:00')
    assert.equal(p.birthTimeAccuracy, 'exact')
    assert.equal(p.heightCm, 168)
    assert.equal(p.age, 28)
    assert.equal(p.statedAge, 28)
  })

  it('keeps the occupation string whole', () => {
    assert.equal(
      p.occupationDetail,
      'ICICI Bank માં વેલ્યુએશન ટેક્નિકલ ઓફિસર, વેસુ બ્રાન્ચ',
    )
  })

  it('tags both phone numbers as the father’s', () => {
    assert.deepEqual(p.phones, [
      { kind: 'father_mobile', value: '+919876543210' },
      { kind: 'father_mobile', value: '+919123456780' },
    ])
  })

  it('normalises the sect to a taxonomy code', () => {
    assert.equal(p.sectRaw, 'jagat')
  })

  it('raises no warnings on a clean biodata', () => {
    assert.deepEqual(p.warnings, [])
  })
})

describe('parseBiodata — Template B (emoji format, truncated)', () => {
  const p = parseBiodata(TEMPLATE_B, new Date('2026-09-06T00:00:00Z'))

  it('parses through the decoration', () => {
    assert.equal(p.fullNameGu, 'કેવલ પ્રવીણભાઈ ઘડિયાળી')
    assert.equal(p.dob, '1995-09-29')
    assert.equal(p.heightCm, 165)
    assert.equal(p.mosalSurname, 'મોતીવાલા')
    assert.equal(p.sectRaw, 'bhagat')
  })

  it('flags the ambiguous birth time', () => {
    assert.equal(p.birthTime, '22:46')
    assert.equal(p.birthTimeAccuracy, 'approx')
    assert.ok(p.warnings.includes('birth_time'))
  })

  // Stated 31, actual 30 — the Indian "running age" convention, off by one.
  // That is normal and must not be flagged.
  it('accepts a one-year age discrepancy silently', () => {
    assert.equal(p.age, 30)
    assert.equal(p.statedAge, 31)
    assert.ok(!p.warnings.includes('age'))
  })

  it('attributes the phone numbers to the mother', () => {
    assert.deepEqual(
      p.phones.map((x) => x.kind),
      ['mother_mobile', 'mother_mobile'],
    )
  })

  it('leaves gender null rather than guessing from the first name', () => {
    assert.equal(p.gender, null)
  })
})

describe('parseBiodata — all-English variant', () => {
  const p = parseBiodata(TEMPLATE_ENGLISH, new Date('2026-09-06T00:00:00Z'))

  it('handles English labels and mixed unit markers', () => {
    assert.equal(p.fullNameEn ?? p.fullNameGu, 'Rutvik Ranjitbhai Chunawala')
    assert.equal(p.dob, '1996-05-28')
    assert.equal(p.heightCm, 157)
    assert.equal(p.mosalName, 'Bhupendra Natwarlal Vasanwala')
    assert.equal(p.sectRaw, 'jagat')
  })

  it('tolerates the "Mobile No." label without a colon-space', () => {
    assert.deepEqual(p.phones, [{ kind: 'self_mobile', value: '+919574368103' }])
  })
})
