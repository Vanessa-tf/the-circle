-- Run this once in the Supabase SQL editor, after avatar-storage.sql /
-- profile-banner.sql / auth-provider-lookup.sql.
--
-- Extends messaging beyond application-scoped threads: a "conversation" is
-- a thread between any two real users, found via search rather than tied to
-- an application. A message now belongs to exactly one of the two —
-- application_id (existing, unchanged behavior) or conversation_id (new) —
-- enforced by a check constraint, so nothing about the existing
-- application-based threads changes.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_different_users check (user_a <> user_b)
);

-- One conversation per unordered pair, regardless of who started it.
create unique index if not exists conversations_unique_pair
  on public.conversations (least(user_a, user_b), greatest(user_a, user_b));

alter table public.conversations enable row level security;

drop policy if exists "Users can read their own conversations" on public.conversations;
create policy "Users can read their own conversations"
  on public.conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "Users can start a conversation with anyone" on public.conversations;
create policy "Users can start a conversation with anyone"
  on public.conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

alter table public.messages alter column application_id drop not null;
alter table public.messages add column if not exists conversation_id uuid
  references public.conversations (id) on delete cascade;

alter table public.messages drop constraint if exists messages_exactly_one_thread;
alter table public.messages add constraint messages_exactly_one_thread check (
  (application_id is not null and conversation_id is null)
  or (application_id is null and conversation_id is not null)
);

drop policy if exists "Parties to an application can read its messages" on public.messages;
drop policy if exists "Parties to a thread can read its messages" on public.messages;
create policy "Parties to a thread can read its messages"
  on public.messages for select
  using (
    (application_id is not null and exists (
      select 1 from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.id = messages.application_id
        and (a.user_id = auth.uid() or l.owner_id = auth.uid())
    ))
    or
    (conversation_id is not null and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    ))
  );

drop policy if exists "Parties to an application can send messages" on public.messages;
drop policy if exists "Parties to a thread can send messages" on public.messages;
create policy "Parties to a thread can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      (application_id is not null and exists (
        select 1 from public.applications a
        join public.listings l on l.id = a.listing_id
        where a.id = messages.application_id
          and (a.user_id = auth.uid() or l.owner_id = auth.uid())
      ))
      or
      (conversation_id is not null and exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id
          and (c.user_a = auth.uid() or c.user_b = auth.uid())
      ))
    )
  );

-- Replacing the single-arg version with a two-arg one is a different
-- overload as far as Postgres is concerned, not a true replace — drop the
-- old signature first so calls naming only p_application_id can't become
-- ambiguous between the two.
drop function if exists public.mark_messages_read(uuid);

create or replace function public.mark_messages_read(
  p_application_id uuid default null,
  p_conversation_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_application_id is not null then
    update public.messages m
    set read_at = now()
    from public.applications a
    join public.listings l on l.id = a.listing_id
    where m.application_id = p_application_id
      and m.sender_id <> auth.uid()
      and m.read_at is null
      and (a.user_id = auth.uid() or l.owner_id = auth.uid());
  elsif p_conversation_id is not null then
    update public.messages m
    set read_at = now()
    from public.conversations c
    where m.conversation_id = p_conversation_id
      and c.id = p_conversation_id
      and m.sender_id <> auth.uid()
      and m.read_at is null
      and (c.user_a = auth.uid() or c.user_b = auth.uid());
  end if;
end;
$$;

grant execute on function public.mark_messages_read(uuid, uuid) to authenticated;
