# Rollback — Lot 6 (backups versionnés, intégrité et rétention)

Document de traçabilité séparé des migrations du Lot 6, qui doivent rester immuables une fois appliquées. Ne jamais modifier une migration déjà appliquée : toute correction passe par une nouvelle migration.

## Migrations concernées

- `supabase/migrations/20260718110000_backup_versioning_schema.sql` — colonnes additives sur `backups`, table `backup_artifacts`.
- `supabase/migrations/20260718110100_backup_snapshot_secured.sql` — `export_backup_snapshot()` **remplacée** (pas additive : la fonction précédente est écrasée par `create or replace function`), `export_audit_log_snapshot()`, `get_latest_applied_migration()`, révocations EXECUTE.
- `supabase/migrations/20260718110200_backup_coverage_helper.sql` — `list_public_base_tables()`.
- `supabase/migrations/20260718120000_backup_atomic_creation.sql` — `backup_artifacts.checksum`/`checksum_algorithm` relâchées en nullable, `create_sensitive_backup_with_audit_artifact()`.
- `supabase/migrations/20260718130000_backup_finalize_checksums.sql` + `20260718130100_backup_finalize_checksums_fix.sql` — `finalize_sensitive_backup_checksums()` (la première version contenait une ambiguïté de colonne PL/pgSQL, corrigée par la seconde — jamais en modifiant la première, toujours par `create or replace` dans un nouveau fichier).

## ⚠️ `export_backup_snapshot()` n'est pas un ajout — c'est un remplacement

Contrairement aux colonnes et à `backup_artifacts` (purement additifs), `export_backup_snapshot()` est la **même fonction, remplacée sur place** (`create or replace function`, même nom, même signature zéro-argument, même type de retour `jsonb`). Le rollback de cette fonction spécifiquement n'est donc pas "additif" — c'est une restauration de définition, à traiter avec la même prudence qu'un rollback de contrainte.

### Définition précédente exacte (avant le Lot 6)

Celle posée par `supabase/migrations/20260718010100_fix_transactional_backup.sql` (fichier historique, jamais modifié — source de vérité) :

```sql
create or replace function public.export_backup_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
begin
  result := jsonb_set(result, '{players}', coalesce((select jsonb_agg(t) from public.players t), '[]'::jsonb));
  result := jsonb_set(result, '{opponents}', coalesce((select jsonb_agg(t) from public.opponents t), '[]'::jsonb));
  -- ... (23 autres tables, une affectation séquentielle par table — voir le
  -- fichier historique pour la liste complète, jamais reproduite ici pour
  -- éviter une divergence avec la source de vérité)
  return result;
end;
$$;
```

**Différence de comportement à connaître avant de restaurer cette version :** cette forme (25 instructions `result := jsonb_set(...)` séquentielles, `language plpgsql`) ne garantit **pas** un instant cohérent unique entre les tables sous READ COMMITTED — c'est précisément le défaut corrigé par le Lot 6 (instruction unique `language sql`, démontré par un protocole à deux sessions concurrentes, voir le compte rendu du lot). Restaurer cette version réintroduit ce défaut.

### Anciens privilèges — ne jamais les restaurer

Avant le Lot 6, aucun `revoke`/`grant` explicite n'existait sur `export_backup_snapshot()` dans les migrations du dépôt — la fonction s'appuyait donc sur les privilèges par défaut du projet Supabase (`ALTER DEFAULT PRIVILEGES` posé à la création du projet, pas dans ce dépôt), potentiellement plus larges que ceux d'aujourd'hui (un projet Supabase par défaut accorde souvent EXECUTE sur les fonctions du schéma `public` à `anon`/`authenticated` en plus de `service_role`, sauf révocation explicite). L'état exact n'a pas été capturé avant la révocation du Lot 6 (aucune requête d'audit des privilèges n'existait avant ce lot).

**Cette information est documentée à titre historique uniquement — elle ne doit jamais être utilisée pour restaurer des privilèges larges.** Un rollback de `export_backup_snapshot()` restaure sa **définition** (le corps de la fonction), jamais ses anciens privilèges : la révocation `public`/`anon`/`authenticated` posée par le Lot 6 est une propriété de sécurité indépendante de la version de la fonction, et reste obligatoire quelle que soit la définition en vigueur.

### Procédure de restauration de la fonction (si nécessaire)

```sql
-- 1. Restaurer l'ancienne définition (comportement uniquement — copier le
--    texte exact du fichier historique 20260718010100_fix_transactional_backup.sql).
--    Cette étape ne touche jamais aux privilèges.
create or replace function public.export_backup_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$ ... $$;  -- coller ici le corps exact du fichier historique

-- 2. Quelle que soit la définition restaurée, conserver OBLIGATOIREMENT les
--    révocations du Lot 6 — ne jamais regrant à anon/authenticated, même
--    pour "revenir à l'état d'avant" :
revoke execute on function public.export_backup_snapshot() from public;
revoke execute on function public.export_backup_snapshot() from anon;
revoke execute on function public.export_backup_snapshot() from authenticated;
grant execute on function public.export_backup_snapshot() to service_role;
```

**Même règle pour toute autre fonction sensible conservée pendant un rollback** (`export_audit_log_snapshot(timestamptz)`, `get_latest_applied_migration()`, `list_public_base_tables()`, `create_sensitive_backup_with_audit_artifact(text, text, text, boolean, uuid, text, text, text, uuid, text)`, `finalize_sensitive_backup_checksums(uuid, text, text)`) — adapter la signature exacte dans les commandes, mais toujours répéter les trois `revoke` + le `grant ... to service_role` après toute restauration de définition.

## Rollback des colonnes et de `backup_artifacts` (additif, sûr)

Toutes les colonnes ajoutées sont nullables, sans `DEFAULT` — aucune ligne existante n'en dépend structurellement. **Mais** si des backups au format 2 ont été créés depuis le Lot 6 (avec des métadonnées, checksums, artefacts réellement utiles), les supprimer ferait perdre cette information de façon irréversible.

```sql
-- ⚠️ Assertion obligatoire avant tout rollback des colonnes/table : refuse
-- de continuer si des données format 2 existent encore et doivent être
-- conservées. À exécuter et faire échouer volontairement la migration si
-- le compte n'est pas 0 et qu'aucune décision explicite de les sacrifier
-- n'a été prise.
do $$
declare
  v_format2_backups integer;
  v_artifacts integer;
begin
  select count(*) into v_format2_backups from public.backups where format_version = 2;
  select count(*) into v_artifacts from public.backup_artifacts;

  if v_format2_backups > 0 or v_artifacts > 0 then
    raise exception
      'Rollback refusé : % backup(s) format 2 et % artefact(s) existent encore. '
      'Exporter/archiver ces données avant de continuer, ou confirmer explicitement leur perte.',
      v_format2_backups, v_artifacts;
  end if;
end $$;

alter table public.backup_artifacts disable row level security;
drop table if exists public.backup_artifacts;

drop function if exists public.finalize_sensitive_backup_checksums(uuid, text, text);
drop function if exists public.create_sensitive_backup_with_audit_artifact(
  text, text, text, boolean, uuid, text, text, text, uuid, text
);
drop function if exists public.export_audit_log_snapshot(timestamptz);
drop function if exists public.get_latest_applied_migration();
drop function if exists public.list_public_base_tables();

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
-- ligne n'utilise encore une des 4 nouvelles valeurs (même principe
-- d'assertion transactionnelle que l'Étape D2 du Lot 5 — à vérifier avant,
-- sinon annuler).
alter table public.backups drop constraint backups_trigger_reason_check;
alter table public.backups add constraint backups_trigger_reason_check check (
  trigger_reason in ('manual', 'before_reset', 'weekly', 'end_of_season')
);
```

## Ce que le rollback NE fait jamais

- Ne supprime aucune ligne de `backups` elle-même (seules les colonnes de métadonnées disparaissent, jamais les lignes) — sauf refus explicite via l'assertion ci-dessus si des données format 2 doivent être sacrifiées.
- Ne touche à aucune autre table de données (`players`, `matches`, etc.).
- Ne modifie aucune des migrations déjà appliquées — toujours une nouvelle migration corrective.

## Solution de secours principale

Restauration depuis le dernier backup connu avant le Lot 6 (`backups.id = ac4f0e1b-6170-49c1-a057-8bfb6c751148`, label `before_remove_legacy_admin_role_constraint`, Lot 5 Étape D2) si une anomalie plus large que le seul schéma du Lot 6 devait être corrigée.
