-- Run this once in the Supabase SQL editor, after schema.sql.

alter table public.profiles add column if not exists portfolio_url text;
