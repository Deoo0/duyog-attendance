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

-- Run after the earlier schema/migrations. Existing rehearsal history is preserved.
begin;
alter table public.rehearsals add column if not exists kind text not null default 'Regular' check (kind in ('Regular','Extra'));
alter table public.rehearsals add column if not exists cancelled boolean not null default false;

-- A single transaction creates the weekly dates. RLS still requires a choir admin.
create or replace function public.create_rehearsal_batch(rows jsonb)
returns setof public.rehearsals
language plpgsql
security invoker
set search_path = ''
as $$
begin
 if not exists(select 1 from public.choir_admins where user_id = auth.uid()) then
  raise exception 'Choir administrator access required' using errcode = '42501';
 end if;
 if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 367 then
  raise exception 'Choose between 1 and 367 rehearsal dates';
 end if;
 -- Serializes repeat submissions so retrying does not create duplicate sessions.
 perform pg_advisory_xact_lock(72403129);
 return query
 insert into public.rehearsals(id,title,date,time,location,notes,kind,cancelled)
 select x.id,x.title,x.date,x.time,x.location,coalesce(x.notes,''),coalesce(x.kind,'Regular'),coalesce(x.cancelled,false)
 from jsonb_to_recordset(rows) as x(id uuid,title text,date date,time time,location text,notes text,kind text,cancelled boolean)
 where not exists(select 1 from public.rehearsals r where r.date=x.date and r.time=x.time and r.kind=coalesce(x.kind,'Regular'))
 on conflict (id) do nothing
 returning *;
end;
$$;
revoke all on function public.create_rehearsal_batch(jsonb) from public, anon, authenticated;
grant execute on function public.create_rehearsal_batch(jsonb) to authenticated;

-- Explicitly public names/voices and absence information requested for the landing page.
-- No table grants are changed. No IDs, contact details, photos, birthdays, or notes returned.
create or replace function public.public_absence_watch()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
 with regular as (
  select r.id,r.title,r.date,r.time
  from public.rehearsals r
  where r.kind='Regular' and not r.cancelled
   and r.date+r.time <= (now() at time zone 'Asia/Manila')
   and exists(select 1 from public.attendance a where a.rehearsal_id=r.id)
 ), marks as (
  select m.id,m.name,m.voice,a.status,
   row_number() over(partition by m.id order by r.date desc,r.time desc,r.id desc) as position
  from public.members m
  join regular r on m.joined is null or r.date>=m.joined
  left join public.attendance a on a.member_id=m.id and a.rehearsal_id=r.id
  where m.status='Active'
 ), breaks as (
  select id,min(position) filter(where status is distinct from 'Absent') as first_break from marks group by id
 ), streaks as (
  select m.id,m.name,m.voice,count(*)::integer as streak
  from marks m join breaks b on b.id=m.id
  where m.status='Absent' and (b.first_break is null or m.position<b.first_break)
  group by m.id,m.name,m.voice
 ), recent as (
  select * from regular order by date desc,time desc,id desc
 )
 select jsonb_build_object(
  'streaks',coalesce((select jsonb_agg(jsonb_build_object('name',name,'voice',voice,'streak',streak) order by streak desc,name,id) from streaks),'[]'::jsonb),
  'rehearsals',coalesce((select jsonb_agg(jsonb_build_object(
   'title',r.title,'date',r.date,'time',r.time,
   'absent',coalesce((select jsonb_agg(jsonb_build_object('name',m.name,'voice',m.voice) order by m.name,m.id)
    from public.attendance a join public.members m on m.id=a.member_id
    where a.rehearsal_id=r.id and a.status='Absent'),'[]'::jsonb)
  ) order by r.date desc,r.time desc,r.id desc) from recent r),'[]'::jsonb)
 );
$$;
revoke all on function public.public_absence_watch() from public, anon, authenticated;
grant execute on function public.public_absence_watch() to anon, authenticated;

-- Keep cancelled rehearsals out of the existing public attendance highlight.
create or replace function public.recent_public_attendance()
returns jsonb language sql stable security definer set search_path = ''
as $$
 with latest as (
  select r.id,r.title,r.date,r.time from public.rehearsals r
  where not r.cancelled and r.date+r.time <= (now() at time zone 'Asia/Manila')
   and exists(select 1 from public.attendance a where a.rehearsal_id=r.id)
  order by r.date desc,r.time desc,r.id desc limit 1
 )
 select jsonb_build_object('title',r.title,'date',r.date,'time',r.time,
  'attendees',coalesce((select jsonb_agg(jsonb_build_object('name',m.name,'voice',m.voice) order by m.name,m.id)
   from public.attendance a join public.members m on m.id=a.member_id
   where a.rehearsal_id=r.id and a.status in ('Present','Late')),'[]'::jsonb)) from latest r;
$$;
revoke all on function public.recent_public_attendance() from public, anon, authenticated;
grant execute on function public.recent_public_attendance() to anon, authenticated;
commit;
