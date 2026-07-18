-- Roadmap V3, Lot 5 — Étape D2 (contract) de la stratégie expand/migrate/contract.
--
-- Pré-vérifié juste avant (agent IA, hors de cette migration) : 0 ligne
-- players.role = 'admin' (migrées vers 'coach' à l'Étape C, 2026-07-18) ;
-- Amine Zahid (df419da0-1ed3-4ad5-af67-cf734e57a3fe) coach + actif +
-- team_settings.owner_player_id ; Ulysse Monneret, Arié Mamou, Warren
-- Scialom, Test Admin coachs ; Test Joueur player. Sauvegarde avant
-- migration : backups.id ac4f0e1b-6170-49c1-a057-8bfb6c751148 (label
-- "before_remove_legacy_admin_role_constraint").
--
-- Purement DDL sur la contrainte : aucune ligne de players n'est lue ni
-- écrite au sens data (hormis la vérification défensive ci-dessous), donc
-- pin_hash/pin_length/session_version/status/owner_player_id et toutes les
-- autres tables (matches, historique, etc.) restent strictement inchangés.
--
-- Transaction unique (fichier de migration = une transaction côté Supabase
-- CLI) : toute erreur, y compris l'exception ci-dessous, annule l'ensemble.

do $$
declare
  remaining_admin_count integer;
begin
  select count(*) into remaining_admin_count from public.players where role = 'admin';
  if remaining_admin_count <> 0 then
    raise exception 'Abandon Étape D2 : % ligne(s) role=admin encore présente(s).', remaining_admin_count;
  end if;
end $$;

alter table public.players drop constraint players_role_check;

alter table public.players add constraint players_role_check CHECK (role IN ('player', 'coach'));
