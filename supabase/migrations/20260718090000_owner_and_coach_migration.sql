-- Roadmap V3, Lot 5 — Étape C (migrate) de la stratégie expand/migrate/contract.
--
-- Pré-vérifié juste avant (agent IA, hors de cette migration) : Amine Zahid
-- (df419da0-1ed3-4ad5-af67-cf734e57a3fe) actif, role='admin' ; team_settings
-- une seule ligne (id=1), owner_player_id NULL ; comptes admin réels =
-- Amine Zahid, Ulysse Monneret, Test Admin ; comptes coach réels = Arié
-- Mamou, Warren Scialom. Sauvegarde avant migration : backups.id
-- 8c90c16d-663d-49a4-bfe7-0d3ad1438590 (label
-- "before_owner_and_coach_migration"), complétée par un export séparé de
-- audit_log (non couvert par export_backup_snapshot par conception).
--
-- Un seul fichier de migration = une seule transaction côté Supabase CLI :
-- toute erreur (y compris l'assertion finale) annule l'intégralité de ce
-- qui suit, y compris les entrées d'audit déjà insérées dans ce bloc.

-- 1. Initialise le propriétaire.
update public.team_settings
set owner_player_id = 'df419da0-1ed3-4ad5-af67-cf734e57a3fe'
where id = 1;

-- audit_log.record_id est de type uuid (contrairement à ownership-actions.ts
-- qui utilise encore le littéral non-uuid "1" pour team_settings, jamais
-- exécuté en réel car OWNERSHIP_TRANSFER_ENABLED=false — anomalie latente
-- distincte, hors périmètre de cette migration). team_settings n'a pas de
-- clé uuid ; on trace l'entrée sur l'uuid du joueur concerné par le
-- changement (le nouveau propriétaire), seule valeur uuid pertinente ici.
insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
values (
  'team_settings',
  'df419da0-1ed3-4ad5-af67-cf734e57a3fe',
  'update',
  jsonb_build_object('owner_player_id', null),
  jsonb_build_object('owner_player_id', 'df419da0-1ed3-4ad5-af67-cf734e57a3fe'),
  null,
  'Migration Lot 5 Etape C (roadmap V3) - initialisation du proprietaire'
);

-- 2-3. Convertit les comptes admin -> coach, incrémente session_version.
-- Ne touche ni pin_hash ni pin_length ni aucun autre champ de profil, et ne
-- touche aucune ligne déjà role='coach' (WHERE role = 'admin' uniquement).
insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by_player_id, changed_by_name)
select
  'players',
  id,
  'update',
  jsonb_build_object('role', 'admin', 'session_version', session_version),
  jsonb_build_object('role', 'coach', 'session_version', session_version + 1),
  null,
  'Migration Lot 5 Etape C (roadmap V3) - conversion admin vers coach'
from public.players
where role = 'admin';

update public.players
set role = 'coach', session_version = session_version + 1
where role = 'admin';

-- 4. Assertion post-migration : annule toute la transaction si un invariant
-- attendu ne tient pas (propriétaire actif et coach ; plus aucune ligne admin).
do $$
declare
  owner_row public.players%rowtype;
  remaining_admin_count integer;
begin
  select * into owner_row from public.players where id = 'df419da0-1ed3-4ad5-af67-cf734e57a3fe';

  if owner_row.status is distinct from 'active' then
    raise exception 'Assertion echouee : le proprietaire n''est plus actif.';
  end if;

  if owner_row.role is distinct from 'coach' then
    raise exception 'Assertion echouee : le proprietaire n''a pas role=coach.';
  end if;

  select count(*) into remaining_admin_count from public.players where role = 'admin';
  if remaining_admin_count <> 0 then
    raise exception 'Assertion echouee : % ligne(s) role=admin restante(s).', remaining_admin_count;
  end if;
end $$;
