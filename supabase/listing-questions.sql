-- Run this once in the Supabase SQL editor, after listings-ownership.sql.
--
-- Lets an org (or a mentor) attach custom screening questions to a listing
-- instead of applicants only ever getting one generic cover-note box.
-- Answers are stored parallel to the listing's questions at the time of
-- application, so editing a listing's questions later doesn't retroactively
-- reshape past applicants' answers.

alter table public.listings
  add column if not exists questions text[] not null default '{}';

alter table public.applications
  add column if not exists answers jsonb not null default '[]'::jsonb;
