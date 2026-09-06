-- Demo profiles for the samaj-setu database.
--
-- Invented people using real Surti/Khambhati/Ahmedabadi/Indori surname
-- patterns. Remove before real members arrive:
--   delete from profiles where public_ref like 'KH-10%';

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000001', c.id, 'KH-1001', 'active', 'જીગર કિરીટભાઈ રંગૂનવાલા', 'Jigar Kiritbhai Rangoonwala',
  'male', '1997-02-14', '07:20', 'exact', 'સુરત', 173, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='surti' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='jagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='veg' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='graduate' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='job' and community_id=c.id),
  'B.E. Computer Engineering', 'Software Engineer, TCS (Adajan)', 'સુરત', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000001', 'કિરીટભાઈ મનસુખલાલ રંગૂનવાલા', 'ભાવના કિરીટભાઈ રંગૂનવાલા', 'નવનીતલાલ ગોરધનદાસ કંસારીવાલા', 'Kansariwala', 'Rangoonwala', 'સુરત')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000001', 'vrishabh', 'manushya', 'none', 'high')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000001', 'father_mobile', '+91999991000', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000002', c.id, 'KH-1002', 'active', 'હાર્દિક ભરતભાઈ વખારીયા', 'Hardik Bharatbhai Vakhariya',
  'male', '1995-07-03', '21:45', 'exact', 'સુરત', 168, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='surti' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='bhagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='veg' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='graduate' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='business' and community_id=c.id),
  'B.Com', 'પોતાનો કાપડનો ધંધો, રીંગ રોડ', 'સુરત', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000002', 'ભરતભાઈ ચીમનલાલ વખારીયા', 'રેખા ભરતભાઈ વખારીયા', 'પ્રફુલચંદ્ર મણિલાલ ગોનાવાલા', 'Gonawala', 'Vakhariya', 'સુરત')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000002', 'kark', 'dev', 'high', 'medium')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000002', 'father_mobile', '+91999991001', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000003', c.id, 'KH-1003', 'active', 'દેવાંગ અશોકભાઈ કાપડીયા', 'Devang Ashokbhai Kapadia',
  'male', '1999-10-08', '05:15', 'exact', 'અમદાવાદ', 178, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='ahmedabadi' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='jagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='veg' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='post_graduate' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='job' and community_id=c.id),
  'M.Pharm', 'QA Officer, Zydus Lifesciences', 'અમદાવાદ', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000003', 'અશોકભાઈ નટવરલાલ કાપડીયા', 'મીના અશોકભાઈ કાપડીયા', 'ચંદ્રકાંત જયંતિલાલ દેગડાવાલા', 'Degdawala', 'Kapadia', 'અમદાવાદ')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000003', 'tula', 'dev', 'none', 'high')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000003', 'father_mobile', '+91999991002', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000004', c.id, 'KH-1004', 'active', 'મિલન નિલેશભાઈ ગલ્લેદાર', 'Milan Nileshbhai Galledar',
  'male', '1993-01-22', null, 'unknown', 'સુરત', 165, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='surti' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='bhagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='nonveg' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='diploma' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='business' and community_id=c.id),
  'Diploma Mechanical', 'પોતાનું વર્કશોપ, કતારગામ', 'સુરત', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000004', 'નિલેશભાઈ કાંતિલાલ ગલ્લેદાર', 'જ્યોત્સના નિલેશભાઈ ગલ્લેદાર', 'દિલીપભાઈ રતિલાલ પસીયાવાલા', 'Pasiyawala', 'Galledar', 'સુરત')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000004', 'makar', 'rakshas', 'unknown', 'low')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000004', 'father_mobile', '+91999991003', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000005', c.id, 'KH-1005', 'active', 'કૃપા રજનીકાંત પસીયાવાલા', 'Krupa Rajnikant Pasiyawala',
  'female', '2000-03-30', '14:05', 'exact', 'સુરત', 160, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='surti' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='jagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='veg' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='post_graduate' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='job' and community_id=c.id),
  'M.Sc. Microbiology', 'Lab In-charge, Unipath Diagnostics', 'સુરત', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000005', 'રજનીકાંત મગનલાલ પસીયાવાલા', 'દક્ષા રજનીકાંત પસીયાવાલા', 'હસમુખલાલ ચુનીલાલ જરીવાલા', 'Jariwala', 'Pasiyawala', 'સુરત')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000005', 'meen', 'dev', 'none', 'high')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000005', 'father_mobile', '+91999991004', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000006', c.id, 'KH-1006', 'active', 'નિધિ સંજયભાઈ ગોનાવાલા', 'Nidhi Sanjaybhai Gonawala',
  'female', '1998-08-17', '18:30', 'exact', 'સુરત', 157, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='surti' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='bhagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='jain' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='graduate' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='job' and community_id=c.id),
  'B.Ed., B.A. Gujarati', 'પ્રાથમિક શિક્ષિકા, નગર પ્રાથમિક શાળા', 'સુરત', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000006', 'સંજયભાઈ રમણલાલ ગોનાવાલા', 'હંસા સંજયભાઈ ગોનાવાલા', 'કનૈયાલાલ પોપટલાલ ભાણાભગવાનવાલા', 'Bhanabhagwanwala', 'Gonawala', 'સુરત')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000006', 'simha', 'manushya', 'low', 'medium')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000006', 'father_mobile', '+91999991005', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000007', c.id, 'KH-1007', 'active', 'શ્રેયા મુકેશભાઈ દેગડાવાલા', 'Shreya Mukeshbhai Degdawala',
  'female', '2001-05-11', '09:50', 'exact', 'વડોદરા', 163, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='khambhati' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='jagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='eggetarian' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='graduate' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='job' and community_id=c.id),
  'B.Arch', 'Junior Architect, Studio Kaya', 'વડોદરા', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000007', 'મુકેશભાઈ ધીરજલાલ દેગડાવાલા', 'અલ્પા મુકેશભાઈ દેગડાવાલા', 'વિનોદરાય શાંતિલાલ કાપડીયા', 'Kapadia', 'Degdawala', 'ખંભાત')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000007', 'mithun', 'dev', 'none', 'high')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000007', 'father_mobile', '+91999991006', 'on_mutual_interest');

insert into profiles (id, community_id, public_ref, status, full_name_gu, full_name_en,
  gender, dob, birth_time, birth_time_accuracy, birth_place_text, height_cm, marital_status,
  sub_community_term_id, sect_term_id, diet_term_id, education_level_term_id, occupation_type_term_id,
  education_detail, occupation_detail, city, source)
select '00000000-0000-4000-8000-000000000008', c.id, 'KH-1008', 'active', 'પલક હિતેશભાઈ કંસારીવાલા', 'Palak Hiteshbhai Kansariwala',
  'female', '1996-11-25', '23:10', 'exact', 'ઇન્દોર', 155, 'never_married',
  (select id from taxonomy_terms where kind='sub_community' and code='indori' and community_id=c.id),
  (select id from taxonomy_terms where kind='sect' and code='bhagat' and community_id=c.id),
  (select id from taxonomy_terms where kind='diet' and code='veg' and community_id=c.id),
  (select id from taxonomy_terms where kind='education_level' and code='professional' and community_id=c.id),
  (select id from taxonomy_terms where kind='occupation_type' and code='professional' and community_id=c.id),
  'C.A.', 'Practising Chartered Accountant', 'ઇન્દોર', 'admin'
from communities c where c.slug = 'khatri-kshatriya'
on conflict (id) do nothing;

insert into profile_family (profile_id, father_name, mother_name, mosal_name, mosal_surname, paternal_surname, native_place)
values ('00000000-0000-4000-8000-000000000008', 'હિતેશભાઈ સુરેશચંદ્ર કંસારીવાલા', 'વર્ષા હિતેશભાઈ કંસારીવાલા', 'ગિરીશભાઈ મગનલાલ રંગૂનવાલા', 'Rangoonwala', 'Kansariwala', 'ઇન્દોર')
on conflict (profile_id) do nothing;

insert into profile_astro (profile_id, declared_rashi, declared_gan, declared_mangal, confidence)
values ('00000000-0000-4000-8000-000000000008', 'vrishchik', 'rakshas', 'high', 'high')
on conflict (profile_id) do nothing;

insert into profile_contacts (profile_id, kind, value_e164, visibility)
values ('00000000-0000-4000-8000-000000000008', 'father_mobile', '+91999991007', 'on_mutual_interest');

