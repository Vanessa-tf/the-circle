-- Run this once in the Supabase SQL editor, after organizations.sql.

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

-- No update policy for anyone — all status changes go through
-- resolve_affiliation() below, which runs as security definer.

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
