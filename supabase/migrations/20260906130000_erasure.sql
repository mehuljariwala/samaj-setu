-- Make member erasure possible.
--
-- Seven foreign keys onto app_users defaulted to NO ACTION, so once a member
-- had done anything auditable they could never be deleted. That blocks the
-- deletion-on-request duty under the DPDP Act 2023, and it also makes routine
-- cleanup impossible.
--
-- The rule applied here: records that exist for *someone else's* benefit — an
-- audit trail, a moderation decision, a consent record, an interest between
-- two families — survive the erasure, but lose their link to the erased
-- person. Records that are purely the member's own (shortlists, views,
-- drafts) already cascade.

alter table audit_log           alter column actor_user_id      drop not null;
alter table consents            alter column granted_by_user_id drop not null;
alter table interests           alter column initiated_by_user_id drop not null;
alter table photo_access_grants alter column granted_by_user_id drop not null;
alter table profile_reviews     alter column reviewer_user_id   drop not null;
alter table reports             alter column reporter_user_id   drop not null;

do $$
declare
  r record;
begin
  for r in
    select con.conname, con.conrelid::regclass::text as tbl, att.attname as col
    from pg_constraint con
    join unnest(con.conkey) with ordinality k(attnum, ord) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
    where con.contype = 'f'
      and con.confrelid = 'app_users'::regclass
      and con.confdeltype = 'a'          -- NO ACTION
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references app_users(id) on delete set null',
      r.tbl, r.conname, r.col
    );
  end loop;
end;
$$;
