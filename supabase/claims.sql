-- Run this once in the Supabase SQL editor, after schema.sql and credits.sql.

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

create policy "Users can read their own claims"
  on public.credit_claims for select
  using (auth.uid() = user_id);

create policy "Users can submit their own claims"
  on public.credit_claims for insert
  with check (auth.uid() = user_id);

-- No update policy for anyone — all status changes go through
-- resolve_credit_claim() below, which runs as security definer.

-- Called by the (unauthenticated) verifier's approval page to display
-- the claim. Deliberately bypasses RLS via security definer, since the
-- verifier has no account and never will — anyone holding the token is
-- meant to be able to view it.
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

-- Called by the verifier's approval page when they click Approve/Reject.
-- Idempotent: revisiting a resolved link just returns the existing
-- status instead of re-processing it.
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
