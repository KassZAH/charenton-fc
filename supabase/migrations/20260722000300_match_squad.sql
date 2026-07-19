-- Roadmap V3, Lot 17 — groupe convoqué, distinct de la présence réelle.
--
-- ⚠️ Macro-release A : appliquée uniquement au projet Supabase isolé tant
-- que la macro-release n'est pas validée en production.
--
-- match_squad_entries représente le PLAN (qui est convoqué, qui est en
-- liste d'attente, qui est le gardien prévu) — ne remplace ni n'écrase
-- jamais availability (réponse du joueur) ni match_players (présence
-- réelle, Lot 13). Les trois restent des signaux indépendants, jamais
-- fusionnés.

create table public.match_squad_entries (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id),
  squad_status text not null check (squad_status in ('called_up', 'waitlist')),
  is_planned_goalkeeper boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

comment on table public.match_squad_entries is
  'Groupe convoqué prévu (Lot 17) — plan, jamais la présence réelle (match_players.was_present) ni la réponse du joueur (availability.status).';

alter table public.match_squad_entries enable row level security;

create index match_squad_entries_match_idx on public.match_squad_entries(match_id);

alter table public.matches
  add column squad_published_at timestamptz,
  add column squad_locked_at timestamptz;

-- Remplace intégralement le groupe convoqué en une seule transaction (jamais un état à moitié
-- écrit entre la suppression et la réinsertion, même modèle que confirm_match_roster du Lot 2).
-- Refuse toute modification une fois verrouillé, sauf déverrouillage explicite préalable.
create or replace function public.set_match_squad(
  p_match_id uuid,
  p_called_up_player_ids uuid[],
  p_waitlist_player_ids uuid[],
  p_planned_goalkeeper_player_id uuid,
  p_publish boolean,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_at timestamptz;
begin
  select squad_locked_at into v_locked_at from public.matches where id = p_match_id for update;
  if v_locked_at is not null then
    raise exception 'Le groupe convoqué est verrouillé — déverrouille-le avant de le modifier.';
  end if;

  if p_planned_goalkeeper_player_id is not null
     and not (p_planned_goalkeeper_player_id = any(coalesce(p_called_up_player_ids, array[]::uuid[]))) then
    raise exception 'Le gardien prévu doit faire partie des joueurs convoqués.';
  end if;

  delete from public.match_squad_entries where match_id = p_match_id;

  insert into public.match_squad_entries (match_id, player_id, squad_status, is_planned_goalkeeper)
  select p_match_id, pid, 'called_up', pid = p_planned_goalkeeper_player_id
  from unnest(coalesce(p_called_up_player_ids, array[]::uuid[])) as pid;

  insert into public.match_squad_entries (match_id, player_id, squad_status, is_planned_goalkeeper)
  select p_match_id, pid, 'waitlist', false
  from unnest(coalesce(p_waitlist_player_ids, array[]::uuid[])) as pid;

  update public.matches
    set squad_published_at = case when p_publish then now() else squad_published_at end,
        squad_locked_at = case when p_publish then now() else squad_locked_at end
    where id = p_match_id;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'matches', p_match_id, 'update', null,
    jsonb_build_object(
      'squad_action', case when p_publish then 'published' else 'draft_saved' end,
      'called_up_count', coalesce(array_length(p_called_up_player_ids, 1), 0),
      'waitlist_count', coalesce(array_length(p_waitlist_player_ids, 1), 0)
    ),
    p_changed_by_player_id, p_changed_by_name
  );
end;
$$;

revoke execute on function public.set_match_squad(uuid, uuid[], uuid[], uuid, boolean, uuid, text) from public;
revoke execute on function public.set_match_squad(uuid, uuid[], uuid[], uuid, boolean, uuid, text) from anon;
revoke execute on function public.set_match_squad(uuid, uuid[], uuid[], uuid, boolean, uuid, text) from authenticated;

create or replace function public.unlock_match_squad(
  p_match_id uuid,
  p_changed_by_player_id uuid,
  p_changed_by_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches set squad_locked_at = null where id = p_match_id;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values ('matches', p_match_id, 'update', null, jsonb_build_object('squad_action', 'unlocked'), p_changed_by_player_id, p_changed_by_name);
end;
$$;

revoke execute on function public.unlock_match_squad(uuid, uuid, text) from public;
revoke execute on function public.unlock_match_squad(uuid, uuid, text) from anon;
revoke execute on function public.unlock_match_squad(uuid, uuid, text) from authenticated;
