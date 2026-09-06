-- Reference data + community taxonomy seed.

-- ------------------------------------------------------- community taxonomy

insert into communities (slug, name_en, name_gu, config) values (
  'khatri-kshatriya',
  'Khatri Kshatriya',
  'ખત્રી ક્ષત્રિય',
  jsonb_build_object(
    'exogamy_rules', jsonb_build_array('mosal_surname','paternal_surname'),
    'sect_is_hard_filter', true,
    'free', true
  )
) on conflict (slug) do nothing;

insert into taxonomy_terms (community_id, kind, code, label_en, label_gu, sort_order)
select c.id, v.kind, v.code, v.label_en, v.label_gu, v.sort_order
from communities c,
(values
  ('sub_community','surti',      'Surti Khatri',      'સુરતી ખત્રી',      1),
  ('sub_community','khambhati',  'Khambhati Khatri',  'ખંભાતી ખત્રી',    2),
  ('sub_community','ahmedabadi', 'Ahmedabadi Khatri', 'અમદાવાદી ખત્રી',  3),
  ('sub_community','indori',     'Indori Khatri',     'ઈન્દોરી ખત્રી',    4),

  ('sect','bhagat', 'Bhagat', 'ભગત', 1),
  ('sect','jagat',  'Jagat',  'જગત',  2),

  ('diet','veg',      'Vegetarian',  'શાકાહારી',      1),
  ('diet','jain',     'Jain',        'જૈન',           2),
  ('diet','eggetarian','Eggetarian', 'ઈંડા સહિત',     3),
  ('diet','nonveg',   'Non-vegetarian','માંસાહારી',   4),

  ('education_level','below_12',   'Below 12th',    '૧૨ ધોરણથી ઓછું',  1),
  ('education_level','hsc',        '12th Pass',     '૧૨ પાસ',          2),
  ('education_level','diploma',    'Diploma',       'ડિપ્લોમા',        3),
  ('education_level','graduate',   'Graduate',      'સ્નાતક',          4),
  ('education_level','post_graduate','Post Graduate','અનુસ્નાતક',      5),
  ('education_level','professional','Professional (CA/MBBS/LLB)','પ્રોફેશનલ', 6),

  ('occupation_type','job',         'Job',          'નોકરી',         1),
  ('occupation_type','business',    'Business',     'ધંધો',          2),
  ('occupation_type','professional','Professional', 'પ્રોફેશનલ',     3),
  ('occupation_type','student',     'Student',      'અભ્યાસ કરે છે',  4),
  ('occupation_type','not_working', 'Not working',  'કામ કરતા નથી',  5)
) as v(kind, code, label_en, label_gu, sort_order)
where c.slug = 'khatri-kshatriya'
on conflict (community_id, kind, code) do nothing;

-- ------------------------------------------------------ jyotish reference
--
-- The 27 nakshatras with their Ashtakoot attributes, and the 12 rashis.
-- These are settled, verifiable reference values.
--
-- NOTE: the koota *scoring matrices* (yoni, vashya, graha maitri) are
-- deliberately NOT seeded here. They vary between traditions, and shipping a
-- subtly wrong matrix would produce confidently wrong guna totals. Full
-- Ashtakoot lands in Phase 1 after review by someone jyotish-literate.
-- See docs/ASTRO-MATCHING.md.

create table rashis (
  idx      int primary key check (idx between 1 and 12),
  code     text unique not null,
  name_en  text not null,
  name_gu  text not null,
  lord     text not null,
  varna    text not null check (varna in ('brahmin','kshatriya','vaishya','shudra')),
  vashya   text not null check (vashya in ('chatushpada','manav','jalachar','vanachar','keet'))
);

insert into rashis (idx, code, name_en, name_gu, lord, varna, vashya) values
  ( 1,'mesh',      'Aries',      'મેષ',     'mars',   'kshatriya','chatushpada'),
  ( 2,'vrishabh',  'Taurus',     'વૃષભ',    'venus',  'vaishya',  'chatushpada'),
  ( 3,'mithun',    'Gemini',     'મિથુન',   'mercury','shudra',   'manav'),
  ( 4,'kark',      'Cancer',     'કર્ક',    'moon',   'brahmin',  'jalachar'),
  ( 5,'simha',     'Leo',        'સિંહ',    'sun',    'kshatriya','vanachar'),
  ( 6,'kanya',     'Virgo',      'કન્યા',   'mercury','vaishya',  'manav'),
  ( 7,'tula',      'Libra',      'તુલા',    'venus',  'shudra',   'manav'),
  ( 8,'vrishchik', 'Scorpio',    'વૃશ્ચિક', 'mars',   'brahmin',  'keet'),
  ( 9,'dhanu',     'Sagittarius','ધનુ',     'jupiter','kshatriya','manav'),
  (10,'makar',     'Capricorn',  'મકર',     'saturn', 'vaishya',  'jalachar'),
  (11,'kumbh',     'Aquarius',   'કુંભ',    'saturn', 'shudra',   'manav'),
  (12,'meen',      'Pisces',     'મીન',     'jupiter','brahmin',  'jalachar');

create table nakshatras (
  idx     int primary key check (idx between 1 and 27),
  code    text unique not null,
  name_en text not null,
  name_gu text not null,
  lord    text not null,
  gan     text not null check (gan  in ('dev','manushya','rakshas')),
  nadi    text not null check (nadi in ('aadi','madhya','antya')),
  yoni    text not null,
  yoni_sex text not null check (yoni_sex in ('m','f'))
);

insert into nakshatras (idx, code, name_en, name_gu, lord, gan, nadi, yoni, yoni_sex) values
  ( 1,'ashwini',    'Ashwini',         'અશ્વિની',      'ketu',   'dev',     'aadi',  'horse',    'm'),
  ( 2,'bharani',    'Bharani',         'ભરણી',         'venus',  'manushya','madhya','elephant', 'm'),
  ( 3,'krittika',   'Krittika',        'કૃત્તિકા',      'sun',    'rakshas', 'antya', 'sheep',    'f'),
  ( 4,'rohini',     'Rohini',          'રોહિણી',       'moon',   'manushya','antya', 'serpent',  'm'),
  ( 5,'mrigashira', 'Mrigashira',      'મૃગશીર્ષ',      'mars',   'dev',     'madhya','serpent',  'f'),
  ( 6,'ardra',      'Ardra',           'આર્દ્રા',       'rahu',   'manushya','aadi',  'dog',      'f'),
  ( 7,'punarvasu',  'Punarvasu',       'પુનર્વસુ',      'jupiter','dev',     'aadi',  'cat',      'f'),
  ( 8,'pushya',     'Pushya',          'પુષ્ય',        'saturn', 'dev',     'madhya','sheep',    'm'),
  ( 9,'ashlesha',   'Ashlesha',        'આશ્લેષા',      'mercury','rakshas', 'antya', 'cat',      'm'),
  (10,'magha',      'Magha',           'મઘા',          'ketu',   'rakshas', 'antya', 'rat',      'm'),
  (11,'purva_phalguni','Purva Phalguni','પૂર્વા ફાલ્ગુની','venus','manushya','madhya','rat',     'f'),
  (12,'uttara_phalguni','Uttara Phalguni','ઉત્તરા ફાલ્ગુની','sun','manushya','aadi', 'cow',     'f'),
  (13,'hasta',      'Hasta',           'હસ્ત',         'moon',   'dev',     'aadi',  'buffalo',  'f'),
  (14,'chitra',     'Chitra',          'ચિત્રા',       'mars',   'rakshas', 'madhya','tiger',    'f'),
  (15,'swati',      'Swati',           'સ્વાતિ',       'rahu',   'dev',     'antya', 'buffalo',  'm'),
  (16,'vishakha',   'Vishakha',        'વિશાખા',       'jupiter','rakshas', 'antya', 'tiger',    'm'),
  (17,'anuradha',   'Anuradha',        'અનુરાધા',      'saturn', 'dev',     'madhya','deer',     'f'),
  (18,'jyeshtha',   'Jyeshtha',        'જ્યેષ્ઠા',      'mercury','rakshas', 'aadi',  'deer',     'm'),
  (19,'mula',       'Mula',            'મૂળ',          'ketu',   'rakshas', 'aadi',  'dog',      'm'),
  (20,'purva_ashadha','Purva Ashadha', 'પૂર્વાષાઢા',    'venus',  'manushya','madhya','monkey',   'm'),
  (21,'uttara_ashadha','Uttara Ashadha','ઉત્તરાષાઢા',  'sun',    'manushya','antya', 'mongoose', 'm'),
  (22,'shravana',   'Shravana',        'શ્રવણ',        'moon',   'dev',     'antya', 'monkey',   'f'),
  (23,'dhanishta',  'Dhanishta',       'ધનિષ્ઠા',      'mars',   'rakshas', 'madhya','lion',     'f'),
  (24,'shatabhisha','Shatabhisha',     'શતભિષા',       'rahu',   'rakshas', 'aadi',  'horse',    'f'),
  (25,'purva_bhadrapada','Purva Bhadrapada','પૂર્વા ભાદ્રપદ','jupiter','manushya','aadi','lion','m'),
  (26,'uttara_bhadrapada','Uttara Bhadrapada','ઉત્તરા ભાદ્રપદ','saturn','manushya','madhya','cow','m'),
  (27,'revati',     'Revati',          'રેવતી',        'mercury','dev',     'antya', 'elephant', 'f');

alter table rashis     enable row level security;
alter table nakshatras enable row level security;
create policy rashis_read     on rashis     for select using (true);
create policy nakshatras_read on nakshatras for select using (true);

-- ------------------------------------------------------- Gan and Nadi koota
--
-- The two the community asks for by name: "રાક્ષસ કે દેવગન" and Nadi. Both are
-- unambiguous across traditions, so they're safe to ship now.

create or replace function app.gan_koota(a text, b text)
returns int language sql immutable as $$
  select case
    when a is null or b is null then null
    when a = b then 6
    when (a = 'dev' and b = 'manushya') or (a = 'manushya' and b = 'dev') then 5
    when (a = 'manushya' and b = 'rakshas') or (a = 'rakshas' and b = 'manushya') then 3
    else 0                    -- dev x rakshas
  end;
$$;

-- Nadi carries the most weight (8) and scores zero when shared — Nadi dosh.
create or replace function app.nadi_koota(a text, b text)
returns int language sql immutable as $$
  select case
    when a is null or b is null then null
    when a = b then 0
    else 8
  end;
$$;

-- -------------------------------------------------------- hard block rules
--
-- Community exogamy and preference gates. Runs before any scoring; a pair
-- with any block is never surfaced. See docs/ASTRO-MATCHING.md.

create or replace function app.hard_blocks(p_a uuid, p_b uuid)
returns jsonb language sql stable as $$
  with a as (
    select pr.*, f.mosal_surname, f.paternal_surname
    from profiles pr left join profile_family f on f.profile_id = pr.id
    where pr.id = p_a
  ),
  b as (
    select pr.*, f.mosal_surname, f.paternal_surname
    from profiles pr left join profile_family f on f.profile_id = pr.id
    where pr.id = p_b
  )
  select coalesce(jsonb_agg(reason), '[]'::jsonb) from (
    select 'same_gender' as reason from a, b where a.gender = b.gender
    union all
    select 'not_active' from a, b where a.status <> 'active' or b.status <> 'active'
    union all
    select 'different_community' from a, b where a.community_id <> b.community_id
    union all
    -- maternal-line exogamy: shared mosal disqualifies
    select 'same_mosal' from a, b
      where a.mosal_surname is not null
        and lower(trim(a.mosal_surname)) = lower(trim(b.mosal_surname))
    union all
    select 'same_surname' from a, b
      where a.paternal_surname is not null
        and lower(trim(a.paternal_surname)) = lower(trim(b.paternal_surname))
    union all
    select 'manual_exclusion' from profile_exclusions e, a, b
      where (e.profile_id = p_a and (
              (e.kind = 'profile' and e.value = p_b::text)
           or (e.kind = 'mosal_surname'    and lower(e.value) = lower(b.mosal_surname))
           or (e.kind = 'paternal_surname' and lower(e.value) = lower(b.paternal_surname))))
         or (e.profile_id = p_b and (
              (e.kind = 'profile' and e.value = p_a::text)
           or (e.kind = 'mosal_surname'    and lower(e.value) = lower(a.mosal_surname))
           or (e.kind = 'paternal_surname' and lower(e.value) = lower(a.paternal_surname))))
    union all
    select 'sect_mismatch' from a, b, profile_preferences pa
      where pa.profile_id = p_a
        and cardinality(pa.sect_term_ids) > 0
        and not (b.sect_term_id = any(pa.sect_term_ids))
    union all
    select 'sub_community_mismatch' from a, b, profile_preferences pa
      where pa.profile_id = p_a
        and cardinality(pa.sub_community_term_ids) > 0
        and not (b.sub_community_term_id = any(pa.sub_community_term_ids))
  ) blocks;
$$;
