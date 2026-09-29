-- Run once in the Supabase SQL editor. One shared choir; only allowlisted admins have access.
begin;
create table public.choir_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.choir_admins enable row level security;
revoke all on public.choir_admins from anon, authenticated;
grant select on public.choir_admins to authenticated;
create policy "Admins can read their own membership" on public.choir_admins for select to authenticated using (user_id = (select auth.uid()));

create table public.members (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 100),
 voice text not null check (voice in ('Soprano','Alto','Tenor','Bass')),
 email text, phone text,
 birthday text, joined date,
 status text not null default 'Active' check (status in ('Active','Inactive')),
 photo text check (octet_length(photo) <= 700000),
 notes text
);
create table public.rehearsals (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 date date not null, time time not null,
 location text not null check (length(trim(location)) > 0),
 notes text not null default ''
);
create table public.attendance (
 id uuid primary key default gen_random_uuid(),
 rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
 member_id uuid not null references public.members(id) on delete cascade,
 status text not null check (status in ('Present','Late','Absent','Excused')),
 unique(rehearsal_id, member_id)
);
create index attendance_member_idx on public.attendance(member_id);
create index rehearsals_date_idx on public.rehearsals(date);
alter table public.members enable row level security;
alter table public.rehearsals enable row level security;
alter table public.attendance enable row level security;
revoke all on public.members, public.rehearsals, public.attendance from anon, authenticated;
grant select, insert, update, delete on public.members, public.rehearsals, public.attendance to authenticated;
create policy "Choir admins manage members" on public.members for all to authenticated
 using (exists (select 1 from public.choir_admins where user_id=(select auth.uid())))
 with check (exists (select 1 from public.choir_admins where user_id=(select auth.uid())));
create policy "Choir admins manage rehearsals" on public.rehearsals for all to authenticated
 using (exists (select 1 from public.choir_admins where user_id=(select auth.uid())))
 with check (exists (select 1 from public.choir_admins where user_id=(select auth.uid())));
create policy "Choir admins manage attendance" on public.attendance for all to authenticated
 using (exists (select 1 from public.choir_admins where user_id=(select auth.uid())))
 with check (exists (select 1 from public.choir_admins where user_id=(select auth.uid())));
commit;
-- After creating a user under Authentication > Users, run separately:
-- insert into public.choir_admins (user_id) values ('YOUR-AUTH-USER-UUID');

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
