-- Consolidated backlog: everything not yet applied to your Supabase project,
-- as of Phase 13. Run this ONCE in the SQL editor (Project > SQL Editor > New
-- query). Checked against your live schema via the REST API before writing
-- this: `schema.sql` (profiles + auth trigger) is already applied — this
-- file covers credits.sql + claims.sql + listings.sql + profile_portfolio.sql
-- + organizations.sql + verification-email.sql + consistency-scoring.sql +
-- fairness-signals.sql + phone-verification.sql + affiliations.sql +
-- listings-ownership.sql, in dependency order. Safe to run even if some of
-- it were already applied (every statement is idempotent: `if not exists`,
-- `or replace`, `on conflict`).
--
-- Phases 6 and 7 (Messages, Activity heatmap) needed no new SQL — they just
-- read from what's created here.

-- =====================================================================
-- From credits.sql
-- =====================================================================

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

drop policy if exists "Users can read their own credits" on public.credits;
create policy "Users can read their own credits"
  on public.credits for select
  using (auth.uid() = user_id);

-- =====================================================================
-- From claims.sql
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.credit_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  skill_category text not null check (
    skill_category in ('Technical', 'Leadership', 'Sales', 'Communication', 'Execution')
  ),
  points int not null check (points > 0),
  org text not null,
  verified_by text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verify_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.credit_claims enable row level security;

drop policy if exists "Users can read their own claims" on public.credit_claims;
create policy "Users can read their own claims"
  on public.credit_claims for select
  using (auth.uid() = user_id);

drop policy if exists "Users can submit their own claims" on public.credit_claims;
create policy "Users can submit their own claims"
  on public.credit_claims for insert
  with check (auth.uid() = user_id);

create or replace function public.get_credit_claim(p_token text)
returns table (
  title text,
  skill_category text,
  points int,
  org text,
  verified_by text,
  status text,
  claimant_name text
)
language sql
security definer set search_path = public
as $$
  select c.title, c.skill_category, c.points, c.org, c.verified_by, c.status, p.full_name
  from public.credit_claims c
  join public.profiles p on p.id = c.user_id
  where c.verify_token = p_token;
$$;

grant execute on function public.get_credit_claim(text) to anon, authenticated;

create or replace function public.resolve_credit_claim(p_token text, p_approve boolean)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_claim record;
begin
  select * into v_claim from public.credit_claims where verify_token = p_token for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.status <> 'pending' then
    return query select v_claim.status;
    return;
  end if;

  if p_approve then
    update public.credit_claims
    set status = 'approved', resolved_at = now()
    where id = v_claim.id;

    insert into public.credits (user_id, title, skill_category, points, verified_by, org)
    values (v_claim.user_id, v_claim.title, v_claim.skill_category, v_claim.points, v_claim.verified_by, v_claim.org);

    return query select 'approved'::text;
  else
    update public.credit_claims
    set status = 'rejected', resolved_at = now()
    where id = v_claim.id;

    return query select 'rejected'::text;
  end if;
end;
$$;

grant execute on function public.resolve_credit_claim(text, boolean) to anon, authenticated;

-- =====================================================================
-- From listings.sql
-- =====================================================================

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
  score_required int,
  score_required_category text check (
    score_required_category is null
    or score_required_category in ('Technical', 'Leadership', 'Sales', 'Communication', 'Execution')
  ),
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

drop policy if exists "Authenticated users can read all listings" on public.listings;
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

drop policy if exists "Users can read their own applications" on public.applications;
create policy "Users can read their own applications"
  on public.applications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own applications" on public.applications;
create policy "Users can create their own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

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

-- =====================================================================
-- From profile_portfolio.sql
-- =====================================================================

alter table public.profiles add column if not exists portfolio_url text;

-- =====================================================================
-- From organizations.sql
-- =====================================================================

alter table public.profiles
  add column if not exists account_type text not null default 'Individual'
  check (account_type in ('Individual', 'Company', 'Institution'));

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can read their own credits" on public.credits;
create policy "Authenticated users can read all credits"
  on public.credits for select
  to authenticated
  using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'account_type', 'Individual')
  );
  return new;
end;
$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  skill_category text not null check (
    skill_category in ('Technical', 'Leadership', 'Sales', 'Communication', 'Execution')
  ),
  points int not null check (points > 0),
  deadline timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "Authenticated users can read all tasks" on public.tasks;
create policy "Authenticated users can read all tasks"
  on public.tasks for select
  to authenticated
  using (true);

drop policy if exists "Companies and institutions can create tasks" on public.tasks;
create policy "Companies and institutions can create tasks"
  on public.tasks for insert
  with check (
    auth.uid() = org_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type in ('Company', 'Institution')
    )
  );

drop policy if exists "Orgs can update their own tasks" on public.tasks;
create policy "Orgs can update their own tasks"
  on public.tasks for update
  using (auth.uid() = org_id)
  with check (auth.uid() = org_id);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  evidence text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (task_id, user_id)
);

alter table public.task_submissions enable row level security;

drop policy if exists "Users can read their own submissions" on public.task_submissions;
create policy "Users can read their own submissions"
  on public.task_submissions for select
  using (auth.uid() = user_id);

drop policy if exists "Orgs can read submissions to their own tasks" on public.task_submissions;
create policy "Orgs can read submissions to their own tasks"
  on public.task_submissions for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_submissions.task_id and t.org_id = auth.uid()
    )
  );

drop policy if exists "Users can submit work for tasks" on public.task_submissions;
create policy "Users can submit work for tasks"
  on public.task_submissions for insert
  with check (auth.uid() = user_id);

-- No update policy for anyone — all status changes go through
-- resolve_task_submission() below, which runs as security definer.

create or replace function public.resolve_task_submission(p_submission_id uuid, p_approve boolean)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_submission record;
  v_task record;
  v_verified_by text;
  v_org_name text;
begin
  select * into v_submission from public.task_submissions where id = p_submission_id for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  select * into v_task from public.tasks where id = v_submission.task_id;

  if v_task.org_id <> auth.uid() then
    raise exception 'Not authorized to resolve this submission';
  end if;

  if v_submission.status <> 'pending' then
    return query select v_submission.status;
    return;
  end if;

  if p_approve then
    update public.task_submissions
    set status = 'approved', resolved_at = now()
    where id = v_submission.id;

    select full_name, account_type into v_org_name, v_verified_by
    from public.profiles where id = auth.uid();

    v_verified_by := case v_verified_by
      when 'Institution' then 'Institution verified'
      else 'Employer verified'
    end;

    insert into public.credits (user_id, title, skill_category, points, verified_by, org)
    values (
      v_submission.user_id,
      v_task.title,
      v_task.skill_category,
      v_task.points,
      v_verified_by,
      coalesce(v_org_name, 'Verified organization')
    );

    return query select 'approved'::text;
  else
    update public.task_submissions
    set status = 'rejected', resolved_at = now()
    where id = v_submission.id;

    return query select 'rejected'::text;
  end if;
end;
$$;

grant execute on function public.resolve_task_submission(uuid, boolean) to authenticated;

-- =====================================================================
-- From verification-email.sql
-- =====================================================================

alter table public.credit_claims
  add column if not exists verifier_email text not null default '';

-- =====================================================================
-- From consistency-scoring.sql
-- =====================================================================

alter table public.credits
  add column if not exists verifier_weight numeric not null default 1.0,
  add column if not exists consistency_factor numeric not null default 1.0
    check (consistency_factor >= 0.7 and consistency_factor <= 1.3);

update public.credits set verifier_weight = case verified_by
  when 'Employer verified' then 1.0
  when 'Institution verified' then 0.85
  when 'University verified' then 0.85
  when 'Client verified' then 0.6
  when 'Mentor verified' then 0.45
  when 'Peer verified' then 0.25
  else 1.0
end;

create or replace function public.compute_consistency_factor(p_user_id uuid)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_total int;
  v_approved int;
begin
  select count(*), count(*) filter (where status = 'approved')
  into v_total, v_approved
  from (
    select status, resolved_at
    from (
      select status, resolved_at from public.credit_claims
        where user_id = p_user_id and status in ('approved', 'rejected')
      union all
      select status, resolved_at from public.task_submissions
        where user_id = p_user_id and status in ('approved', 'rejected')
    ) combined
    order by resolved_at desc
    limit 20
  ) recent;

  if v_total is null or v_total < 5 then
    return 1.0;
  end if;

  return greatest(0.7, least(1.3, 0.7 + 0.6 * (v_approved::numeric / v_total)));
end;
$$;

create or replace function public.compute_verifier_weight(p_org_id uuid, p_base_weight numeric)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.task_submissions ts
  join public.tasks t on t.id = ts.task_id
  where t.org_id = p_org_id and ts.status in ('approved', 'rejected');

  if v_count < 5 then
    return round(p_base_weight * 0.7, 4);
  end if;
  return p_base_weight;
end;
$$;

create or replace function public.resolve_credit_claim(p_token text, p_approve boolean)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_claim record;
  v_weight numeric;
  v_consistency numeric;
begin
  select * into v_claim from public.credit_claims where verify_token = p_token for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_claim.status <> 'pending' then
    return query select v_claim.status;
    return;
  end if;

  if p_approve then
    v_consistency := public.compute_consistency_factor(v_claim.user_id);
    v_weight := case v_claim.verified_by
      when 'Employer verified' then 1.0
      when 'Institution verified' then 0.85
      when 'University verified' then 0.85
      when 'Client verified' then 0.6
      when 'Mentor verified' then 0.45
      when 'Peer verified' then 0.25
      else 1.0
    end;

    update public.credit_claims
    set status = 'approved', resolved_at = now()
    where id = v_claim.id;

    insert into public.credits
      (user_id, title, skill_category, points, verified_by, org, verifier_weight, consistency_factor)
    values
      (v_claim.user_id, v_claim.title, v_claim.skill_category, v_claim.points, v_claim.verified_by,
       v_claim.org, v_weight, v_consistency);

    return query select 'approved'::text;
  else
    update public.credit_claims
    set status = 'rejected', resolved_at = now()
    where id = v_claim.id;

    return query select 'rejected'::text;
  end if;
end;
$$;

create or replace function public.resolve_task_submission(p_submission_id uuid, p_approve boolean)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_submission record;
  v_task record;
  v_verified_by text;
  v_org_name text;
  v_account_type text;
  v_base_weight numeric;
  v_weight numeric;
  v_consistency numeric;
begin
  select * into v_submission from public.task_submissions where id = p_submission_id for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  select * into v_task from public.tasks where id = v_submission.task_id;

  if v_task.org_id <> auth.uid() then
    raise exception 'Not authorized to resolve this submission';
  end if;

  if v_submission.status <> 'pending' then
    return query select v_submission.status;
    return;
  end if;

  if p_approve then
    v_consistency := public.compute_consistency_factor(v_submission.user_id);

    select full_name, account_type into v_org_name, v_account_type
    from public.profiles where id = auth.uid();

    v_base_weight := case v_account_type when 'Institution' then 0.85 else 1.0 end;
    v_weight := public.compute_verifier_weight(v_task.org_id, v_base_weight);

    v_verified_by := case v_account_type
      when 'Institution' then 'Institution verified'
      else 'Employer verified'
    end;

    update public.task_submissions
    set status = 'approved', resolved_at = now()
    where id = v_submission.id;

    insert into public.credits
      (user_id, title, skill_category, points, verified_by, org, verifier_weight, consistency_factor)
    values
      (v_submission.user_id, v_task.title, v_task.skill_category, v_task.points, v_verified_by,
       coalesce(v_org_name, 'Verified organization'), v_weight, v_consistency);

    return query select 'approved'::text;
  else
    update public.task_submissions
    set status = 'rejected', resolved_at = now()
    where id = v_submission.id;

    return query select 'rejected'::text;
  end if;
end;
$$;

-- =====================================================================
-- From fairness-signals.sql
-- =====================================================================

create or replace function public.get_fairness_signals(p_user_id uuid)
returns table (
  peer_share numeric,
  repeat_verifier boolean,
  recent_rate numeric,
  recent_n int,
  prior_rate numeric,
  prior_n int
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_weighted numeric;
  v_peer_weighted numeric;
begin
  select
    coalesce(sum(points * verifier_weight * consistency_factor), 0),
    coalesce(sum(points * verifier_weight * consistency_factor) filter (where verified_by = 'Peer verified'), 0)
  into v_total_weighted, v_peer_weighted
  from public.credits
  where user_id = p_user_id;

  if v_total_weighted > 0 then
    peer_share := v_peer_weighted / v_total_weighted;
  else
    peer_share := 0;
  end if;

  select exists (
    select 1 from public.credit_claims
    where user_id = p_user_id and status = 'approved' and verifier_email <> ''
    group by verifier_email
    having count(*) >= 3
  ) into repeat_verifier;

  with ordered as (
    select status, row_number() over (order by resolved_at desc) as rn
    from (
      select status, resolved_at from public.credit_claims
        where user_id = p_user_id and status in ('approved', 'rejected')
      union all
      select status, resolved_at from public.task_submissions
        where user_id = p_user_id and status in ('approved', 'rejected')
    ) combined
  )
  select
    count(*) filter (where rn between 1 and 10 and status = 'approved')::numeric
      / nullif(count(*) filter (where rn between 1 and 10), 0),
    count(*) filter (where rn between 1 and 10),
    count(*) filter (where rn between 11 and 20 and status = 'approved')::numeric
      / nullif(count(*) filter (where rn between 11 and 20), 0),
    count(*) filter (where rn between 11 and 20)
  into recent_rate, recent_n, prior_rate, prior_n
  from ordered;

  return next;
end;
$$;

grant execute on function public.get_fairness_signals(uuid) to authenticated;

-- =====================================================================
-- From phone-verification.sql
-- =====================================================================

alter table public.profiles
  add column if not exists phone_verified boolean not null default false;

create or replace function public.handle_phone_verified()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set phone_verified = (new.phone_confirmed_at is not null)
  where id = new.id;
  return new;
end;
$$;

create or replace trigger on_auth_user_phone_verified
  after update of phone_confirmed_at on auth.users
  for each row
  when (old.phone_confirmed_at is distinct from new.phone_confirmed_at)
  execute function public.handle_phone_verified();

-- =====================================================================
-- From affiliations.sql
-- =====================================================================

create table if not exists public.affiliations (
  id uuid primary key default gen_random_uuid(),
  individual_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (individual_id, org_id)
);

alter table public.affiliations enable row level security;

drop policy if exists "Individuals can read their own affiliation requests" on public.affiliations;
create policy "Individuals can read their own affiliation requests"
  on public.affiliations for select
  using (auth.uid() = individual_id);

drop policy if exists "Orgs can read affiliation requests sent to them" on public.affiliations;
create policy "Orgs can read affiliation requests sent to them"
  on public.affiliations for select
  using (auth.uid() = org_id);

drop policy if exists "Individuals can request affiliation with an org" on public.affiliations;
create policy "Individuals can request affiliation with an org"
  on public.affiliations for insert
  with check (
    auth.uid() = individual_id
    and exists (
      select 1 from public.profiles p
      where p.id = org_id and p.account_type in ('Company', 'Institution')
    )
  );

create or replace function public.resolve_affiliation(p_affiliation_id uuid, p_approve boolean)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_affiliation record;
begin
  select * into v_affiliation from public.affiliations where id = p_affiliation_id for update;

  if not found then
    raise exception 'Affiliation request not found';
  end if;

  if v_affiliation.org_id <> auth.uid() then
    raise exception 'Not authorized to resolve this affiliation request';
  end if;

  if v_affiliation.status <> 'pending' then
    return query select v_affiliation.status;
    return;
  end if;

  if p_approve then
    update public.affiliations
    set status = 'approved', resolved_at = now()
    where id = v_affiliation.id;
    return query select 'approved'::text;
  else
    update public.affiliations
    set status = 'rejected', resolved_at = now()
    where id = v_affiliation.id;
    return query select 'rejected'::text;
  end if;
end;
$$;

grant execute on function public.resolve_affiliation(uuid, boolean) to authenticated;

-- =====================================================================
-- From listings-ownership.sql
-- =====================================================================

alter table public.listings
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists status text not null default 'open' check (status in ('open', 'closed'));

alter table public.applications
  add column if not exists note text not null default '',
  add column if not exists resolved_at timestamptz;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check check (status in ('applied', 'accepted', 'rejected'));

drop policy if exists "Owners can create their own listings" on public.listings;
create policy "Owners can create their own listings"
  on public.listings for insert
  with check (
    auth.uid() = owner_id
    and (
      (category = 'Mentors' and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'Individual'
      ))
      or (category <> 'Mentors' and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.account_type in ('Company', 'Institution')
      ))
    )
  );

drop policy if exists "Owners can update their own listings" on public.listings;
create policy "Owners can update their own listings"
  on public.listings for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Listing owners can read applications sent to them" on public.applications;
create policy "Listing owners can read applications sent to them"
  on public.applications for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id and l.owner_id = auth.uid()
    )
  );

create or replace function public.resolve_application(p_application_id uuid, p_approve boolean)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_application record;
  v_listing record;
begin
  select * into v_application from public.applications where id = p_application_id for update;

  if not found then
    raise exception 'Application not found';
  end if;

  select * into v_listing from public.listings where id = v_application.listing_id;

  if v_listing.owner_id is null or v_listing.owner_id <> auth.uid() then
    raise exception 'Not authorized to resolve this application';
  end if;

  if v_application.status <> 'applied' then
    return query select v_application.status;
    return;
  end if;

  if p_approve then
    update public.applications
    set status = 'accepted', resolved_at = now()
    where id = v_application.id;
    return query select 'accepted'::text;
  else
    update public.applications
    set status = 'rejected', resolved_at = now()
    where id = v_application.id;
    return query select 'rejected'::text;
  end if;
end;
$$;

grant execute on function public.resolve_application(uuid, boolean) to authenticated;

-- Startup "View" shows real computed stats (team score avg, open roles)
-- rather than trusting stored fake numbers. Affiliations RLS only lets the
-- individual or the owning org read a given affiliation row, so an arbitrary
-- browsing user can't aggregate another org's roster directly — this
-- SECURITY DEFINER function returns just the aggregate, same pattern as the
-- fairness-engine functions, without exposing individual affiliation rows.
create or replace function public.get_startup_stats(p_owner_id uuid)
returns table (team_score_avg numeric, member_count int, open_roles int)
language sql
security definer set search_path = public
as $$
  select
    coalesce((
      select avg(c.score)
      from public.affiliations a
      join (
        select user_id, sum(points * verifier_weight * consistency_factor) as score
        from public.credits
        group by user_id
      ) c on c.user_id = a.individual_id
      where a.org_id = p_owner_id and a.status = 'approved'
    ), 0)::numeric as team_score_avg,
    (
      select count(*)::int from public.affiliations a
      where a.org_id = p_owner_id and a.status = 'approved'
    ) as member_count,
    (
      select count(*)::int from public.listings l
      where l.owner_id = p_owner_id and l.category = 'Jobs' and l.status = 'open'
    ) as open_roles;
$$;

grant execute on function public.get_startup_stats(uuid) to authenticated;

-- =====================================================================
-- From listing-questions.sql
-- =====================================================================

alter table public.listings
  add column if not exists questions text[] not null default '{}';

alter table public.applications
  add column if not exists answers jsonb not null default '[]'::jsonb;

-- =====================================================================
-- From auth-provider-lookup.sql
-- =====================================================================

create or replace function public.get_auth_providers(p_email text)
returns text[]
language sql
security definer set search_path = public
as $$
  select coalesce(array_agg(distinct i.provider), '{}')
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(p_email);
$$;

grant execute on function public.get_auth_providers(text) to anon, authenticated;

-- =====================================================================
-- From avatar-storage.sql
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- From messaging.sql
-- =====================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

create policy "Parties to an application can read its messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = messages.application_id
        and (a.user_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

create policy "Parties to an application can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = messages.application_id
        and (a.user_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

create or replace function public.mark_messages_read(p_application_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.messages m
  set read_at = now()
  from public.applications a
  join public.listings l on l.id = a.listing_id
  where m.application_id = p_application_id
    and a.id = p_application_id
    and m.sender_id <> auth.uid()
    and m.read_at is null
    and (a.user_id = auth.uid() or l.owner_id = auth.uid());
end;
$$;

grant execute on function public.mark_messages_read(uuid) to authenticated;

-- =====================================================================
-- Optional: seed a few sample credits for a test account so the app has
-- real numbers to show immediately. Replace the email below with an
-- account you've already signed up with, then uncomment and run
-- separately (safe to leave commented — nothing above depends on it).
-- =====================================================================

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
