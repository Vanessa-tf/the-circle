-- Run this once in the Supabase SQL editor, after messaging.sql.
--
-- Lets the login screen tell "wrong password" apart from "this account only
-- has Google sign-in, there's no password to check against" — GoTrue itself
-- deliberately returns the same generic error for both (anti-enumeration),
-- so there's no way to distinguish them from a failed signInWithPassword()
-- call alone. This function is intentionally narrow: it only ever returns
-- provider *names*, never anything else about the account, and is callable
-- by anon (the user isn't signed in yet when they hit this).

create or replace function public.get_auth_providers(p_email text)
returns text[]
language sql
security definer set search_path = public
as $$
  select coalesce(array_agg(distinct i.provider), '{}')
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(p_email);
$$;

grant execute on function public.get_auth_providers(text) to anon, authenticated;
