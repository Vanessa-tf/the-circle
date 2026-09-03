-- Run this once in the Supabase SQL editor, after company-directory.sql.
--
-- Lets an org undo an approve/reject decision on the three org-dashboard
-- review flows that don't involve an external verifier: task submissions,
-- listing applications, and affiliation requests. (credit_claims is
-- deliberately excluded — that one is resolved by an external verifier via
-- an emailed link, not by the org itself, so it's not "the company
-- dashboard.")
--
-- Task submissions are the one case with a real side effect: approving one
-- inserts a row into credits. To undo that safely (not just guess which
-- credit row to delete), credits needs a way to trace back to the
-- submission that created it.

alter table public.credits add column if not exists source_submission_id uuid
  references public.task_submissions (id) on delete set null;

-- Re-declare resolve_task_submission to stamp source_submission_id on the
-- credit it inserts (identical to before otherwise).
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

    insert into public.credits (user_id, title, skill_category, points, verified_by, org, source_submission_id)
    values (
      v_submission.user_id,
      v_task.title,
      v_task.skill_category,
      v_task.points,
      v_verified_by,
      coalesce(v_org_name, 'Verified organization'),
      v_submission.id
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

create or replace function public.undo_task_submission_resolution(p_submission_id uuid)
returns table (status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_submission record;
  v_task record;
begin
  select * into v_submission from public.task_submissions where id = p_submission_id for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  select * into v_task from public.tasks where id = v_submission.task_id;

  if v_task.org_id <> auth.uid() then
    raise exception 'Not authorized to undo this decision';
  end if;

  if v_submission.status = 'pending' then
    return query select v_submission.status;
    return;
  end if;

  if v_submission.status = 'approved' then
    delete from public.credits where source_submission_id = v_submission.id;
  end if;

  update public.task_submissions
  set status = 'pending', resolved_at = null
  where id = v_submission.id;

  return query select 'pending'::text;
end;
$$;

grant execute on function public.undo_task_submission_resolution(uuid) to authenticated;

create or replace function public.undo_application_resolution(p_application_id uuid)
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
    raise exception 'Not authorized to undo this decision';
  end if;

  if v_application.status = 'applied' then
    return query select v_application.status;
    return;
  end if;

  update public.applications
  set status = 'applied', resolved_at = null
  where id = v_application.id;

  return query select 'applied'::text;
end;
$$;

grant execute on function public.undo_application_resolution(uuid) to authenticated;

create or replace function public.undo_affiliation_resolution(p_affiliation_id uuid)
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
    raise exception 'Not authorized to undo this decision';
  end if;

  if v_affiliation.status = 'pending' then
    return query select v_affiliation.status;
    return;
  end if;

  update public.affiliations
  set status = 'pending', resolved_at = null
  where id = v_affiliation.id;

  return query select 'pending'::text;
end;
$$;

grant execute on function public.undo_affiliation_resolution(uuid) to authenticated;
