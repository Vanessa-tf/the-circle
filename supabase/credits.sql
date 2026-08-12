-- Run this once in the Supabase SQL editor, after schema.sql.

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  skill_category text not null check (
    skill_category in ('Technical', 'Leadership', 'Sales', 'Communication', 'Execution')
  ),
  points int not null check (points > 0),
  verified_by text not null,
  org text not null,
  awarded_at timestamptz not null default now()
);

alter table public.credits enable row level security;

create policy "Users can read their own credits"
  on public.credits for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Optional: seed a few sample credits for a test account so the app has
-- real numbers to show. Replace the email below with an account you've
-- already signed up with, then uncomment and run.
-- ---------------------------------------------------------------------

-- insert into public.credits (user_id, title, skill_category, points, verified_by, org, awarded_at)
-- select u.id, v.title, v.skill_category, v.points, v.verified_by, v.org, v.awarded_at
-- from (select id from auth.users where email = 'you@example.com') as u
-- cross join (values
--   ('Sales Project — Q2 pipeline build', 'Sales', 40, 'Employer verified', 'Sable Fintech', now() - interval '6 days'),
--   ('Leadership Project — student guild', 'Leadership', 25, 'University verified', 'Strathmore University', now() - interval '11 days'),
--   ('Freelance Website — Duka storefront', 'Technical', 60, 'Client verified', 'Duka OS', now() - interval '18 days'),
--   ('Data Analysis Sprint', 'Technical', 30, 'Employer verified', 'Mavuno Health', now() - interval '31 days'),
--   ('Pitch Communication Workshop', 'Communication', 15, 'Institution verified', 'iHub Nairobi', now() - interval '40 days'),
--   ('Product Launch Execution', 'Execution', 35, 'Employer verified', 'Sable Fintech', now() - interval '53 days')
-- ) as v(title, skill_category, points, verified_by, org, awarded_at);
