-- Run this once in the Supabase SQL editor, after organizations.sql.
--
-- Phone verification via Supabase Auth's built-in phone-change flow
-- (supabase.auth.updateUser({ phone }) + verifyOtp({ type: 'phone_change' })).
-- GoTrue enforces phone uniqueness across accounts the same way it already
-- enforces email uniqueness — that's what actually delivers "one real
-- identity per user," not anything added here.

alter table public.profiles
  add column if not exists phone_verified boolean not null default false;

-- Mirrors the raw auth.users.phone_confirmed_at into a public, PII-free
-- boolean. No client-side write path exists for this column, so it can't
-- be spoofed by calling the profiles update endpoint directly.
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
