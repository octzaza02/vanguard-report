-- Match video attachments
-- Run this once in the Supabase SQL Editor (project: competition-stats).
--   * public bucket: anyone can play/download via the public object URL
--   * no storage.objects policies: anon cannot write directly; uploads only go
--     through signed upload URLs issued by app/api/match-video/route.ts
--     (service role, after validating the app session token)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  true,
  52428800, -- 50 MB (Supabase free-tier per-file max)
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
