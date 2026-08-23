-- Run this once in the Supabase SQL editor, after affiliations.sql.
--
-- Gives listings real owners so applying actually reaches someone. Company/
-- Institution accounts own Jobs/Freelance/Investors/Startups listings;
-- individuals own Mentors listings (the first review flow in this app owned
-- by a person rather than an org — resolve_application() checks owner_id
-- regardless of account type, so this needs no special-casing). The 12
-- existing seeded listings keep owner_id null and behave exactly as before
-- — they just won't appear in anyone's "manage my listings" view.

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

-- No update policy for anyone — all status changes go through
-- resolve_application() below, which runs as security definer.

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
