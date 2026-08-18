-- Run this once in the Supabase SQL editor, after consistency-scoring.sql.
--
-- A first pass at the analytics/fairness engine: three signals computed
-- from data already being collected, no new tracking needed.
--   - reliability trend: last 10 resolved items vs the 10 before that
--   - peer_share: how much of this person's score leans on the lowest-trust
--     verifier tier, directly addressing "reduce impact of friend-only
--     validation" from the product spec
--   - repeat_verifier: the same verifier_email approving 3+ of this
--     person's self-reported claims — a real collusion signal now that
--     claims carry a verifier_email (see verification-email.sql)

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
