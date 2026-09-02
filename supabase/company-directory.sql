-- Run this once in the Supabase SQL editor, after direct-messaging.sql.
--
-- Real, well-known companies shown as "Unclaimed" until the real company
-- signs up and claims the entry. Deliberately a separate table from
-- profiles — these aren't real accounts (profiles.id must reference a real
-- auth.users row), just factual directory listings, so nothing here
-- overlaps with the real account model until claimed.

create table if not exists public.company_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  industry text not null,
  location text not null,
  website text,
  description text not null,
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.company_directory enable row level security;

drop policy if exists "Authenticated users can read the company directory" on public.company_directory;
create policy "Authenticated users can read the company directory"
  on public.company_directory for select
  to authenticated
  using (true);

-- Claiming is the only write path exposed to the app: a Company/Institution
-- account may claim any entry that's still unclaimed. USING restricts which
-- existing rows are eligible (must be unclaimed); WITH CHECK restricts what
-- the new row can look like (must claim as themselves, and only if their
-- own account is actually a Company/Institution).
drop policy if exists "Companies can claim an unclaimed directory entry" on public.company_directory;
create policy "Companies can claim an unclaimed directory entry"
  on public.company_directory for update
  using (claimed_by is null)
  with check (
    claimed_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type in ('Company', 'Institution')
    )
  );

-- Seed: a short, deliberately conservative list of large, already very
-- publicly-known South African companies. Facts only (industry + HQ city),
-- nothing implying they use or endorse this platform.
insert into public.company_directory (name, industry, location, website, description) values
  ('Naspers', 'Media & Internet', 'Cape Town', 'https://naspers.com', 'Global consumer internet and media group headquartered in Cape Town.'),
  ('Standard Bank Group', 'Banking & Financial Services', 'Johannesburg', 'https://standardbank.com', 'One of Africa''s largest banking groups by assets.'),
  ('Discovery Limited', 'Insurance & Health', 'Johannesburg', 'https://discovery.co.za', 'Financial services group known for health and life insurance.'),
  ('Takealot', 'E-commerce', 'Cape Town', 'https://takealot.com', 'One of South Africa''s largest online retailers.'),
  ('Shoprite Holdings', 'Retail', 'Cape Town', 'https://shopriteholdings.co.za', 'Africa''s largest food retailer by revenue.'),
  ('MTN Group', 'Telecommunications', 'Johannesburg', 'https://mtn.com', 'Pan-African telecommunications group.'),
  ('Vodacom', 'Telecommunications', 'Johannesburg', 'https://vodacom.com', 'Major South African mobile network operator.'),
  ('Woolworths Holdings', 'Retail', 'Cape Town', 'https://woolworthsholdings.co.za', 'Retail group spanning food, clothing, and homeware.'),
  ('Sasol', 'Energy & Chemicals', 'Johannesburg', 'https://sasol.com', 'Integrated energy and chemicals company.'),
  ('FirstRand', 'Banking & Financial Services', 'Johannesburg', 'https://firstrand.co.za', 'Financial services group and parent of FNB.'),
  ('Capitec Bank', 'Banking & Financial Services', 'Stellenbosch', 'https://capitecbank.co.za', 'Retail bank known for its digital-first, low-fee model.'),
  ('Absa Group', 'Banking & Financial Services', 'Johannesburg', 'https://absa.africa', 'Pan-African financial services group.'),
  ('Nedbank Group', 'Banking & Financial Services', 'Johannesburg', 'https://nedbank.co.za', 'One of South Africa''s four largest banking groups.'),
  ('MultiChoice Group', 'Media & Broadcasting', 'Johannesburg', 'https://multichoice.com', 'Pay-television and video entertainment group, parent of DStv.'),
  ('Bidvest Group', 'Diversified Services', 'Johannesburg', 'https://bidvest.co.za', 'Diversified services, trading, and distribution group.')
on conflict (name) do nothing;
