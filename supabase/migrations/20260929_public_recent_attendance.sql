-- Public login-page summary. Run in the Supabase SQL Editor before deployment.
-- Exposes only the latest recorded rehearsal title/date/time and attending names/voices.
-- No direct anonymous table access is granted. Contact details, photos, notes,
-- absent/excused members, and historical registers remain private.
begin;
create or replace function public.recent_public_attendance()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
 with latest as (
  select r.id, r.title, r.date, r.time
  from public.rehearsals r
  where r.date + r.time <= (now() at time zone 'Asia/Manila')
   and exists (select 1 from public.attendance a where a.rehearsal_id = r.id)
  order by r.date desc, r.time desc, r.id desc
  limit 1
 )
 select jsonb_build_object(
  'title', r.title, 'date', r.date, 'time', r.time,
  'attendees', coalesce((
   select jsonb_agg(jsonb_build_object('name', m.name, 'voice', m.voice) order by m.name, m.id)
   from public.attendance a
   join public.members m on m.id = a.member_id
   where a.rehearsal_id = r.id and a.status in ('Present', 'Late')
  ), '[]'::jsonb)
 )
 from latest r;
$$;
revoke all on function public.recent_public_attendance() from public, anon, authenticated;
grant execute on function public.recent_public_attendance() to anon, authenticated;
comment on function public.recent_public_attendance() is
 'Intentionally public, restricted summary for the login page. Manila local rehearsal times. No parameters or private member fields.';
commit;
