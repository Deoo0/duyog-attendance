-- Run in the existing project's Supabase SQL Editor before deploying the updated app.
-- Keeps existing member information and all access policies intact.
begin;
alter table public.members
 alter column email drop not null, alter column email drop default,
 alter column phone drop not null, alter column phone drop default,
 alter column birthday drop not null, alter column birthday drop default,
 alter column joined drop not null, alter column joined drop default,
 alter column photo drop not null, alter column photo drop default,
 alter column notes drop not null, alter column notes drop default;
commit;
