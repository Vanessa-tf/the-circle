-- Run this once in the Supabase SQL editor, after claims.sql.

alter table public.credit_claims
  add column if not exists verifier_email text not null default '';
