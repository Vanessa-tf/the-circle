-- Run this once in the Supabase SQL editor, after schema.sql and credits.sql.

alter table public.profiles
  add column if not exists account_type text not null default 'Individual'
  check (account_type in ('Individual', 'Company', 'Institution'));

-- Public credit history: any authenticated account can read any profile or
-- credit row. This is what candidate search needs, and matches the product
-- principle that credits are public, not anonymous.
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

-- Called by the org that owns the task to approve or reject a submission.
-- Idempotent: revisiting an already-resolved submission just returns the
-- existing status instead of re-processing it.
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
