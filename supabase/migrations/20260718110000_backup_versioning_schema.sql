-- Roadmap V3, Lot 6 — Backups versionnés et rétention (schéma).
--
-- Purement additif : toutes les nouvelles colonnes de `backups` sont
-- nullables, sans DEFAULT. Les 4 backups existants ne sont jamais réécrits
-- (NULL = format 1 / legacy, lu comme tel côté application, jamais un
-- format 2 artificiellement attribué après coup).

alter table public.backups
  add column format_version integer,
  add column backup_type text,
  add column protected boolean,
  add column created_by_context text,
  add column application_commit text,
  add column database_schema_version text,
  add column active_season_id uuid references public.seasons(id) on delete set null,
  add column active_season_name text,
  add column tables_included text[],
  add column tables_excluded text[],
  add column exclusion_reasons jsonb,
  add column checksum text,
  add column checksum_algorithm text;

-- Compatibilité legacy : ces contraintes acceptent explicitement NULL (les
-- 4 lignes existantes), et ne contraignent que les nouvelles écritures.
alter table public.backups
  add constraint backups_format_version_check
  check (format_version is null or format_version = 2);

alter table public.backups
  add constraint backups_backup_type_check
  check (backup_type is null or backup_type in ('manual', 'routine', 'pre_operation', 'end_of_season'));

alter table public.backups
  add constraint backups_checksum_pair_check
  check (
    (checksum is null and checksum_algorithm is null)
    or (checksum is not null and checksum_algorithm = 'sha256-canonical-json-v1')
  );

-- Taxonomie de déclencheurs étendue (élargissement uniquement, les 4
-- valeurs déjà utilisées par les lignes existantes restent acceptées).
alter table public.backups drop constraint backups_trigger_reason_check;
alter table public.backups add constraint backups_trigger_reason_check check (
  trigger_reason in (
    'manual', 'weekly', 'before_reset', 'before_restore',
    'before_migration', 'before_fusion', 'before_unlock', 'end_of_season'
  )
);

-- Artefacts associés à un backup (premier et seul type au Lot 6 : audit_log,
-- exclu du snapshot standard car append-only et potentiellement volumineux).
-- Jamais de récursion : payload est toujours du contenu brut, jamais une
-- référence à un autre backup ou artefact.
create table public.backup_artifacts (
  id uuid primary key default gen_random_uuid(),
  backup_id uuid not null references public.backups(id) on delete cascade,
  artifact_type text not null,
  format_version integer not null,
  row_count integer not null,
  checksum text not null,
  checksum_algorithm text not null,
  payload jsonb not null,
  source_cutoff_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by_player_id uuid references public.players(id) on delete set null,
  constraint backup_artifacts_backup_id_artifact_type_key unique (backup_id, artifact_type),
  constraint backup_artifacts_artifact_type_check check (artifact_type in ('audit_log')),
  constraint backup_artifacts_row_count_check check (row_count >= 0),
  constraint backup_artifacts_checksum_algorithm_check check (checksum_algorithm = 'sha256-canonical-json-v1')
);

-- RLS activée, aucune policy : accès exclusif via le chemin serveur
-- (service_role), même modèle que `backups`.
alter table public.backup_artifacts enable row level security;
