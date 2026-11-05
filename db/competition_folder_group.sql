-- User-defined folder group ("หมวดหมู่") for competitions.
-- The folder page groups competitions by this value; the form offers the
-- user's previously used groups and lets them type a new one.

alter table competitions add column if not exists folder_group text;

drop function if exists public.create_competition(text, text, text, text, text, text, text, jsonb);
drop function if exists public.update_competition(text, uuid, text, text, text, text, text, text, jsonb);

create or replace function public.create_competition(
  p_token text, p_name text, p_game text default '', p_category text default '',
  p_decklog text default '', p_decklog_image text default null, p_notes text default null,
  p_attachments jsonb default '[]'::jsonb, p_folder_group text default null
)
returns competitions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_row competitions;
begin
  v_user_id := _session_user(p_token::uuid);
  insert into competitions (user_id, name, game, category, decklog, decklog_image, notes, attachments, folder_group)
  values (v_user_id, p_name, p_game, p_category, p_decklog, p_decklog_image, p_notes, p_attachments,
          nullif(trim(coalesce(p_folder_group, '')), ''))
  returning * into v_row;
  return v_row;
end;
$function$;

create or replace function public.update_competition(
  p_token text, p_id uuid, p_name text, p_game text default '', p_category text default '',
  p_decklog text default '', p_decklog_image text default null, p_notes text default null,
  p_attachments jsonb default '[]'::jsonb, p_folder_group text default null
)
returns competitions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_row competitions;
begin
  v_user_id := _session_user(p_token::uuid);
  update competitions
  set name = p_name, game = p_game, category = p_category,
      decklog = p_decklog, decklog_image = p_decklog_image, notes = p_notes,
      attachments = p_attachments,
      folder_group = nullif(trim(coalesce(p_folder_group, '')), '')
  where id = p_id and user_id = v_user_id
  returning * into v_row;
  if not found then raise exception 'not found or forbidden'; end if;
  return v_row;
end;
$function$;

grant execute on function public.create_competition(text, text, text, text, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.update_competition(text, uuid, text, text, text, text, text, text, jsonb, text) to anon, authenticated;
