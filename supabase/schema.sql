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
 email text not null default '', phone text not null default '',
 birthday text not null default '', joined date not null default current_date,
 status text not null default 'Active' check (status in ('Active','Inactive')),
 photo text not null default '' check (octet_length(photo) <= 700000),
 notes text not null default ''
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
