-- Charenton FC — Mode Démo : purge transactionnelle (réinitialisation ou suppression complète).
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé tant que la validation manuelle n'a pas eu lieu.
--
-- Une seule fonction pour les deux opérations demandées ("Réinitialiser" et "Supprimer
-- entièrement") — p_delete_season distingue les deux : false conserve la ligne seasons (le mode
-- Démo reste accessible, prêt à être re-semé) ; true la supprime aussi (aucune trace du mode Démo
-- restante). Idempotente : si la saison n'existe déjà plus, traité comme un no-op réussi plutôt
-- qu'une erreur — jamais bloquant sur un second appel. Refuse absolument toute saison qui n'est
-- pas explicitement is_demo=true : c'est le seul garde-fou qui empêche cette fonction de purger
-- une vraie saison par erreur d'identifiant.
--
-- Les matchs et tout ce qui en dépend (goals/cards/match_players/availability/votes/match_awards/
-- match_squad_entries/match_equipment_items/match_checklist_items/carpool_assignments) sont
-- supprimés par cascade FK existante — seule la suppression de la ligne matches est explicite ici.
-- player_restrictions.season_id, venues.is_demo, match_templates.is_demo, checklist_templates.is_demo
-- n'ont pas de cascade automatique (pas de FK vers matches) — supprimés explicitement.
-- Ne touche JAMAIS players, dues d'une vraie saison, ni aucune autre table hors de ce périmètre.

create or replace function public.purge_demo_dataset(
  p_demo_season_id uuid,
  p_delete_season boolean,
  p_requested_by_player_id uuid,
  p_requested_by_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_id uuid;
  v_is_demo boolean;
  v_matches_deleted integer := 0;
  v_restrictions_deleted integer := 0;
  v_venues_deleted integer := 0;
  v_templates_deleted integer := 0;
  v_checklist_templates_deleted integer := 0;
  v_season_deleted boolean := false;
begin
  select id, is_demo into v_season_id, v_is_demo from public.seasons where id = p_demo_season_id for update;

  if v_season_id is null then
    -- Idempotence : déjà purgée (ou jamais créée) — succès, rien à faire.
    return jsonb_build_object(
      'season_found', false, 'matches_deleted', 0, 'restrictions_deleted', 0,
      'venues_deleted', 0, 'templates_deleted', 0, 'checklist_templates_deleted', 0, 'season_deleted', false
    );
  end if;

  if not v_is_demo then
    raise exception 'Refus : la saison % n''est pas marquée is_demo — purge interdite sur une saison réelle.', p_demo_season_id;
  end if;

  delete from public.matches where season_id = p_demo_season_id;
  get diagnostics v_matches_deleted = row_count;

  delete from public.player_restrictions where season_id = p_demo_season_id;
  get diagnostics v_restrictions_deleted = row_count;

  delete from public.venues where is_demo = true;
  get diagnostics v_venues_deleted = row_count;

  delete from public.match_templates where is_demo = true;
  get diagnostics v_templates_deleted = row_count;

  delete from public.checklist_templates where is_demo = true;
  get diagnostics v_checklist_templates_deleted = row_count;

  if p_delete_season then
    delete from public.seasons where id = p_demo_season_id;
    v_season_deleted := true;
  end if;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
  values (
    'seasons', p_demo_season_id, case when p_delete_season then 'delete' else 'update' end,
    jsonb_build_object('is_demo', true),
    jsonb_build_object(
      'operation', case when p_delete_season then 'delete_demo_dataset' else 'reset_demo_dataset' end,
      'matches_deleted', v_matches_deleted, 'restrictions_deleted', v_restrictions_deleted,
      'venues_deleted', v_venues_deleted, 'templates_deleted', v_templates_deleted,
      'checklist_templates_deleted', v_checklist_templates_deleted, 'season_deleted', v_season_deleted
    ),
    p_requested_by_player_id, p_requested_by_name
  );

  return jsonb_build_object(
    'season_found', true, 'matches_deleted', v_matches_deleted, 'restrictions_deleted', v_restrictions_deleted,
    'venues_deleted', v_venues_deleted, 'templates_deleted', v_templates_deleted,
    'checklist_templates_deleted', v_checklist_templates_deleted, 'season_deleted', v_season_deleted
  );
end;
$$;

revoke execute on function public.purge_demo_dataset(uuid, boolean, uuid, text) from public;
revoke execute on function public.purge_demo_dataset(uuid, boolean, uuid, text) from anon;
revoke execute on function public.purge_demo_dataset(uuid, boolean, uuid, text) from authenticated;
