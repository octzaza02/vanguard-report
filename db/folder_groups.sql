-- Saved folder groups ("หมวดหมู่") per user, so they can be reused without retyping.
-- Run after competition_folder_group.sql.
--   * public read (the folder page is public)
--   * writes only through RPCs that validate the session token

create table if not exists public.folder_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.folder_groups enable row level security;
drop policy if exists folder_groups_public_read on public.folder_groups;
create policy folder_groups_public_read on public.folder_groups for select using (true);
grant select on public.folder_groups to anon, authenticated;

-- Backfill from groups already used on competitions.
insert into public.folder_groups (user_id, name)
select distinct user_id, folder_group from public.competitions where folder_group is not null
on conflict do nothing;

create or replace function public.add_folder_group(p_token text, p_name text)
returns public.folder_groups
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_row folder_groups;
begin
  v_user_id := _session_user(p_token::uuid);
  if v_name = '' then raise exception 'กรุณาระบุชื่อหมวดหมู่'; end if;
  if length(v_name) > 60 then raise exception 'ชื่อหมวดหมู่ยาวเกินไป'; end if;
  insert into folder_groups (user_id, name) values (v_user_id, v_name)
  on conflict (user_id, name) do update set name = excluded.name
  returning * into v_row;
  return v_row;
end;
$function$;

-- Removes the group from the saved list and un-groups the user's competitions in it.
create or replace function public.delete_folder_group(p_token text, p_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_name text;
begin
  v_user_id := _session_user(p_token::uuid);
  delete from folder_groups where id = p_id and user_id = v_user_id returning name into v_name;
  if v_name is null then raise exception 'not found or forbidden'; end if;
  update competitions set folder_group = null where user_id = v_user_id and folder_group = v_name;
end;
$function$;

-- Saving a competition with a group also remembers that group.
create or replace function public._remember_folder_group()
returns trigger
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if new.folder_group is not null then
    insert into folder_groups (user_id, name) values (new.user_id, new.folder_group)
    on conflict do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists competitions_remember_folder_group on public.competitions;
create trigger competitions_remember_folder_group
after insert or update of folder_group on public.competitions
for each row execute function public._remember_folder_group();

grant execute on function public.add_folder_group(text, text) to anon, authenticated;
grant execute on function public.delete_folder_group(text, uuid) to anon, authenticated;
revoke execute on function public._remember_folder_group() from anon, authenticated, public;
