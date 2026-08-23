-- Run this once in the Supabase SQL editor, after claims.sql.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('Jobs', 'Freelance', 'Investors', 'Startups', 'Mentors')
  ),
  title text not null unique,
  subtitle text not null,
  verified boolean not null default true,
  metric_label text not null,
  metric_value text not null,
  secondary_label text not null,
  secondary_value text not null,
  secondary_value_accent boolean not null default false,
  action_label text not null,
  button_variant text not null default 'dark' check (button_variant in ('dark', 'accent')),
  -- null score_required = no eligibility check (Startups/Mentors, which describe
  -- the *other* party rather than requiring anything of the viewer).
  -- score_required set + score_required_category null = compare against total Circle Score.
  -- both set = compare against that specific skill's total.
  score_required int,
  score_required_category text check (
    score_required_category is null
    or score_required_category in ('Technical', 'Leadership', 'Sales', 'Communication', 'Execution')
  ),
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "Authenticated users can read all listings"
  on public.listings for select
  to authenticated
  using (true);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  status text not null default 'applied',
  applied_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.applications enable row level security;

create policy "Users can read their own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can create their own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

-- Seed data. Listings aren't user-owned, so unlike credits.sql's seed
-- block this just always runs.

insert into public.listings
  (category, title, subtitle, metric_label, metric_value, secondary_label, secondary_value, secondary_value_accent, action_label, button_variant, score_required, score_required_category)
values
  ('Jobs', 'Product Analyst', 'Mavuno Health · Full-time · Remote', 'SCORE REQUIRED', '760+', 'SALARY', 'R68-82k', false, 'Apply', 'dark', 760, null),
  ('Jobs', 'Growth Lead', 'Sable Fintech · Hybrid · Nairobi', 'SCORE REQUIRED', '820+', 'SALARY', 'R74-90k', false, 'Apply', 'dark', 820, null),
  ('Jobs', 'UX Researcher', 'Northpine Labs · Contract', 'SCORE REQUIRED', '700+', 'SALARY', 'R55/hr', false, 'Apply', 'dark', 700, null),

  ('Freelance', 'Website Design', 'E-commerce redesign · 4 weeks', 'BUDGET', 'R3,200', 'CREDITS REQUIRED', '120 Technical', true, 'Apply', 'accent', 120, 'Technical'),
  ('Freelance', 'Brand Identity System', 'Logo, type, guidelines · 3 weeks', 'BUDGET', 'R1,800', 'CREDITS REQUIRED', '80 Execution', true, 'Apply', 'accent', 80, 'Execution'),
  ('Freelance', 'Sales Deck Rework', 'Series A pitch · 1 week', 'BUDGET', 'R950', 'CREDITS REQUIRED', '60 Sales', true, 'Apply', 'accent', 60, 'Sales'),

  ('Investors', 'Amara Ventures', 'Pre-seed & seed · Fintech, health', 'CHECK SIZE', 'R50-250k', 'MIN FOUNDER SCORE', '840+', false, 'Pitch', 'dark', 840, null),
  ('Investors', 'Baobab Capital', 'Seed · Marketplaces, SaaS', 'CHECK SIZE', 'R100-500k', 'MIN FOUNDER SCORE', '860+', false, 'Pitch', 'dark', 860, null),

  ('Startups', 'Kijani Energy', 'Solar micro-grids · Hiring 4 roles', 'TEAM SCORE AVG', '871', 'OPEN ROLES', '4', false, 'View', 'dark', null, null),
  ('Startups', 'Duka OS', 'Retail SaaS · Hiring 2 roles', 'TEAM SCORE AVG', '812', 'OPEN ROLES', '2', false, 'View', 'dark', null, null),

  ('Mentors', 'Grace Wanjiru', 'VP Product, ex-Stripe · Product strategy', 'SESSIONS', '30 min', 'MENTOR SCORE', '947', true, 'Book', 'accent', null, null),
  ('Mentors', 'David Kim', 'Founder, 2 exits · Fundraising', 'SESSIONS', '45 min', 'MENTOR SCORE', '921', true, 'Book', 'accent', null, null)
on conflict (title) do nothing;
