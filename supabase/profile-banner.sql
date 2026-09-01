-- Run this once in the Supabase SQL editor, after avatar-storage.sql.
--
-- Cover/banner photo, stored the same way as the avatar (same "avatars"
-- bucket, same owner-only-folder RLS from avatar-storage.sql — just a
-- different filename prefix within that folder, so no new storage policies
-- are needed).

alter table public.profiles add column if not exists banner_url text;
