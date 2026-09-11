-- Discussion board feature
-- Run this once in the Supabase SQL Editor (project: competition-stats).
-- Mirrors the app's custom-session + SECURITY DEFINER RPC pattern:
--   * public read via the board_feed view (anon SELECT)
--   * writes only through RPCs that validate the session token and enforce ownership
--   * one level of threading (a reply cannot itself be replied to)

create table if not exists public.board_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  parent_id  uuid references public.board_posts(id) on delete cascade,
  content    text,
  image      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited     boolean not null default false
);

create index if not exists board_posts_parent_created_idx on public.board_posts (parent_id, created_at);
create index if not exists board_posts_created_idx on public.board_posts (created_at);

-- Lock the table: no direct client access; everything goes through the view + RPCs below.
alter table public.board_posts enable row level security;

-- Public feed with author name + avatar (view runs as owner, so it can read users).
create or replace view public.board_feed as
select p.id, p.user_id, p.parent_id, p.content, p.image,
       p.created_at, p.updated_at, p.edited,
       u.name   as author_name,
       u.avatar as author_avatar
from public.board_posts p
join public.users u on u.id = p.user_id;

grant select on public.board_feed to anon, authenticated;

-- Create a post (or a reply when p_parent_id is given).
create or replace function public.create_board_post(
  p_token uuid, p_content text, p_image text, p_parent_id uuid default null
)
returns public.board_posts
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_row public.board_posts;
begin
  v_user_id := _session_user(p_token);

  if coalesce(trim(p_content), '') = '' and p_image is null then
    raise exception 'ต้องมีข้อความหรือรูปภาพ';
  end if;

  -- Only allow replying to a top-level post (one level deep).
  if p_parent_id is not null then
    if not exists (select 1 from board_posts where id = p_parent_id and parent_id is null) then
      raise exception 'ไม่พบโพสต์ที่ต้องการตอบกลับ';
    end if;
  end if;

  insert into board_posts (user_id, parent_id, content, image)
  values (v_user_id, p_parent_id, nullif(trim(coalesce(p_content, '')), ''), p_image)
  returning * into v_row;

  return v_row;
end;
$function$;

-- Edit your own post/reply.
create or replace function public.update_board_post(
  p_token uuid, p_id uuid, p_content text, p_image text
)
returns public.board_posts
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_row public.board_posts;
begin
  v_user_id := _session_user(p_token);

  if coalesce(trim(p_content), '') = '' and p_image is null then
    raise exception 'ต้องมีข้อความหรือรูปภาพ';
  end if;

  update board_posts
  set content    = nullif(trim(coalesce(p_content, '')), ''),
      image      = p_image,
      updated_at = now(),
      edited     = true
  where id = p_id and user_id = v_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'ไม่พบข้อความหรือคุณไม่มีสิทธิ์แก้ไข';
  end if;

  return v_row;
end;
$function$;

-- Delete your own post/reply (admins may delete anyone's, for moderation).
-- Deleting a top-level post cascades to its replies.
create or replace function public.delete_board_post(p_token uuid, p_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_is_admin boolean;
begin
  v_user_id := _session_user(p_token);
  select is_admin into v_is_admin from users where id = v_user_id;

  delete from board_posts
  where id = p_id and (user_id = v_user_id or coalesce(v_is_admin, false));

  if not found then
    raise exception 'ไม่พบข้อความหรือคุณไม่มีสิทธิ์ลบ';
  end if;
end;
$function$;

grant execute on function public.create_board_post(uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.update_board_post(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.delete_board_post(uuid, uuid) to anon, authenticated;
