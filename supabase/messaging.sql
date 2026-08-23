-- Run this once in the Supabase SQL editor, after listing-questions.sql.
--
-- Real two-way messaging, scoped to an application. Every messaging
-- relationship in this app currently flows through a real application (a
-- job/freelance/investor application or a mentor booking), so a thread is
-- keyed by application_id rather than being an open-ended DM system —
-- either party to that application (the applicant, or the listing owner)
-- can send and read messages in it.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

drop policy if exists "Parties to an application can read its messages" on public.messages;
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

drop policy if exists "Parties to an application can send messages" on public.messages;
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

-- No update policy — marking read only happens through mark_messages_read()
-- below, so a party can never rewrite the other party's message content.

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
