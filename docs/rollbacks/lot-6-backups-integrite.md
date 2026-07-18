# Rollback — Lot 6 (backups versionnés, intégrité et rétention)

Document de traçabilité séparé des migrations du Lot 6, qui doivent rester immuables une fois appliquées.

## Migrations concernées

- `supabase/migrations/20260718110000_backup_versioning_schema.sql` — colonnes additives sur `backups`, table `backup_artifacts`.
- `supabase/migrations/20260718110100_backup_snapshot_secured.sql` — `export_backup_snapshot()` réécrite, `export_audit_log_snapshot()`, `get_latest_applied_migration()`.
- `supabase/migrations/20260718110200_backup_coverage_helper.sql` — `list_public_base_tables()`.

## Rollback des colonnes et de la table (si nécessaire)

Toutes les colonnes ajoutées sont nullables, sans `DEFAULT` — aucune ligne existante n'en dépend. Les 4 backups legacy restent utilisables même après un rollback complet (ils n'ont jamais utilisé ces colonnes).

```sql
alter table public.backup_artifacts disable row level security;
drop table if exists public.backup_artifacts;

alter table public.backups
  drop constraint if exists backups_format_version_check,
  drop constraint if exists backups_backup_type_check,
  drop constraint if exists backups_checksum_pair_check;

alter table public.backups
  drop column if exists format_version,
  drop column if exists backup_type,
  drop column if exists protected,
  drop column if exists created_by_context,
  drop column if exists application_commit,
  drop column if exists database_schema_version,
  drop column if exists active_season_id,
  drop column if exists active_season_name,
  drop column if exists tables_included,
  drop column if exists tables_excluded,
  drop column if exists exclusion_reasons,
  drop column if exists checksum,
  drop column if exists checksum_algorithm;

-- Restreint trigger_reason aux 4 valeurs d'origine — uniquement si aucune
-- ligne n'utilise encore une des 4 nouvelles valeurs (vérifier avant, sinon
-- annuler : avec le même principe d'assertion transactionnelle que l'Étape D2 du Lot 5).
alter table public.backups drop constraint backups_trigger_reason_check;
alter table public.backups add constraint backups_trigger_reason_check check (
  trigger_reason in ('manual', 'before_reset', 'weekly', 'end_of_season')
);
```

## Rollback des fonctions SQL

```sql
-- Revient à la version multi-instructions (non recommandé — réintroduit le
-- bug de cohérence documenté au Lot 6 ; à n'utiliser qu'en dernier recours).
-- La définition exacte de la version précédente est dans
-- supabase/migrations/20260718010100_fix_transactional_backup.sql
-- (fichier historique, jamais modifié).

drop function if exists public.export_audit_log_snapshot(timestamptz);
drop function if exists public.get_latest_applied_migration();
drop function if exists public.list_public_base_tables();
```

## Ce que le rollback NE fait jamais

- Ne supprime aucune ligne de `backups` (les 4 backups legacy et tout backup créé au format 2 restent intacts, seules les colonnes de métadonnées disparaissent).
- Ne touche à aucune autre table de données (`players`, `matches`, etc.).
- Ne modifie aucune des migrations déjà appliquées — toujours une nouvelle migration corrective.

## Solution de secours principale

Restauration depuis le dernier backup connu avant le Lot 6 (`backups.id = ac4f0e1b-6170-49c1-a057-8bfb6c751148`, label `before_remove_legacy_admin_role_constraint`, Lot 5 Étape D2) si une anomalie plus large que le seul schéma du Lot 6 devait être corrigée.
