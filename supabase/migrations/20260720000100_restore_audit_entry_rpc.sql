-- Roadmap V3, Lot 8 — Transactions critiques restantes.
--
-- ⚠️ Cette migration n'est appliquée QUE sur le projet Supabase isolé
-- pendant la macro-release 8-11, jamais sur le projet partagé sans
-- validation manuelle explicite.
--
-- Remplace restoreChange() (audit-actions.ts) : verrouille l'entrée
-- d'historique, refuse toute double restauration, restaure UNIQUEMENT une
-- liste explicite de colonnes autorisées par table (jamais old_data
-- appliqué tel quel), marque restored_at dans la même transaction.
--
-- Correctif de sécurité découvert pendant l'audit du Lot 8 : l'ancienne
-- implémentation TypeScript restaurait `old_data` intégralement pour
-- `players` (issu d'un `select("*")` dans updatePlayer), qui inclut
-- `pin_hash`/`pin_length`/`session_version` — restaurer une fiche joueur
-- via l'historique pouvait donc silencieusement réactiver un ancien hash de
-- PIN et annuler une révocation de session délibérée. La nouvelle RPC
-- n'autorise jamais l'écriture de ces colonnes, quelle que soit la table.
--
-- Ne restaure jamais table_name = 'team_settings' (transfert de propriété —
-- règles propres, jamais un simple retour en arrière) : combinaison absente
-- de la liste autorisée ci-dessous, donc rejetée par la branche `else`.
-- Ne constitue en aucun cas une restauration globale de backup : une seule
-- ligne, dans une seule table, par appel.

create or replace function public.restore_audit_entry_transactional(
  p_audit_log_id uuid
)
returns table (
  restored boolean,
  restored_table_name text,
  restored_record_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_old jsonb;
begin
  -- === 1. Verrou explicite + idempotence (double-clic / concurrence) ===
  select * into v_entry from public.audit_log where id = p_audit_log_id for update;
  if v_entry.id is null then
    raise exception 'Entrée d''historique introuvable.';
  end if;
  if v_entry.restored_at is not null then
    raise exception 'Cette entrée a déjà été restaurée.';
  end if;

  v_old := v_entry.old_data;

  -- === 2. Restauration — uniquement les combinaisons table/action explicitement autorisées,
  --        uniquement les colonnes explicitement listées, jamais old_data appliqué tel quel ===
  if v_entry.table_name = 'matches' and v_entry.action = 'update' then
    if v_old is null then
      raise exception 'Pas de valeur précédente à restaurer.';
    end if;
    update public.matches set
      team_score = (v_old ->> 'team_score')::integer,
      opponent_score = (v_old ->> 'opponent_score')::integer,
      status = coalesce(v_old ->> 'status', status)
    where id = v_entry.record_id;

  elsif v_entry.table_name = 'goals' and v_entry.action = 'insert' then
    update public.goals set deleted_at = now() where id = v_entry.record_id;

  elsif v_entry.table_name = 'goals' and v_entry.action = 'delete' then
    if v_old is null then
      raise exception 'Pas de valeur précédente à restaurer.';
    end if;
    insert into public.goals (id, match_id, scorer_player_id, assist_player_id, credited_to, goal_type, minute, is_unknown_scorer, deleted_at)
    values (
      v_entry.record_id,
      (v_old ->> 'match_id')::uuid,
      (v_old ->> 'scorer_player_id')::uuid,
      (v_old ->> 'assist_player_id')::uuid,
      coalesce(v_old ->> 'credited_to', 'charenton'),
      v_old ->> 'goal_type',
      (v_old ->> 'minute')::integer,
      (v_old ->> 'is_unknown_scorer')::boolean,
      null
    )
    on conflict (id) do update set deleted_at = null;

  elsif v_entry.table_name = 'cards' and v_entry.action = 'insert' then
    update public.cards set deleted_at = now() where id = v_entry.record_id;

  elsif v_entry.table_name = 'cards' and v_entry.action = 'delete' then
    if v_old is null then
      raise exception 'Pas de valeur précédente à restaurer.';
    end if;
    insert into public.cards (id, match_id, player_id, card_type, minute, comment, deleted_at)
    values (
      v_entry.record_id,
      (v_old ->> 'match_id')::uuid,
      (v_old ->> 'player_id')::uuid,
      v_old ->> 'card_type',
      (v_old ->> 'minute')::integer,
      v_old ->> 'comment',
      null
    )
    on conflict (id) do update set deleted_at = null;

  elsif v_entry.table_name = 'players' and v_entry.action = 'update' then
    if v_old is null then
      raise exception 'Pas de valeur précédente à restaurer.';
    end if;
    -- Allow-list stricte : jamais pin_hash, pin_length, session_version, status, archived_at, role.
    update public.players set
      first_name = coalesce(v_old ->> 'first_name', first_name),
      last_name = v_old ->> 'last_name',
      nickname = v_old ->> 'nickname',
      shirt_number = (v_old ->> 'shirt_number')::integer,
      primary_position = v_old ->> 'primary_position',
      strong_foot = v_old ->> 'strong_foot',
      quote = v_old ->> 'quote'
    where id = v_entry.record_id;

  else
    raise exception 'Restauration non autorisée pour % / %.', v_entry.table_name, v_entry.action;
  end if;

  -- === 3. Marquage restored_at dans la même transaction ===
  update public.audit_log set restored_at = now() where id = p_audit_log_id;

  return query select true, v_entry.table_name, v_entry.record_id;
end;
$$;

revoke execute on function public.restore_audit_entry_transactional(uuid) from public;
revoke execute on function public.restore_audit_entry_transactional(uuid) from anon;
revoke execute on function public.restore_audit_entry_transactional(uuid) from authenticated;
