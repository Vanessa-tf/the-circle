-- Run this once in the Supabase SQL editor, after organizations.sql.
--
-- Adds the two missing multipliers from the scoring model: a per-credit
-- consistency factor for the earner, and a verifier-weight ramp for brand
-- new Company/Institution accounts. Both are computed once, at approval
-- time, and frozen onto the credit row — so a credit's value never
-- silently drifts later just because someone's track record changed.

alter table public.credits
  add column if not exists verifier_weight numeric not null default 1.0,
  add column if not exists consistency_factor numeric not null default 1.0
    check (consistency_factor >= 0.7 and consistency_factor <= 1.3);

-- Backfill existing credits with the weight their verified_by label already
-- implied, so historical scores don't silently change under this migration.
update public.credits set verifier_weight = case verified_by
  when 'Employer verified' then 1.0
  when 'Institution verified' then 0.85
  when 'University verified' then 0.85
  when 'Client verified' then 0.6
  when 'Mentor verified' then 0.45
  when 'Peer verified' then 0.25
  else 1.0
end;

-- How reliable has this earner been lately? First 5 resolved items (across
-- both claims and task submissions) are neutral — not enough history to
-- judge. After that, it's the approval rate over their most recent 20
-- resolutions, so one bad patch is always recoverable.
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

-- A brand new Company/Institution account hasn't earned full trust yet:
-- its first 5 verifications count at 70% of its tier's weight, then it
-- graduates to full weight. Prevents a fresh org account from instantly
-- minting full-strength credits with zero track record.
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
    -- Computed from history before this claim is marked resolved, so it
    -- doesn't count toward its own consistency score.
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
    -- Computed from history before this submission is marked resolved, on
    -- both sides — the earner's consistency and the org's own ramp.
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
