import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireFreshCoach, requireOwner } from "@/lib/auth/current-user";
import type { Backup, BackupArtifact, BackupTriggerReason } from "@/types/models";
import type { Json } from "@/types/database";
import { CHECKSUM_ALGORITHM, backupTypeForTriggerReason, computeChecksum, requiresAuditLogArtifact } from "./backup-integrity";

/**
 * Toutes les tables de données sauvegardées, à l'exception de audit_log,
 * backups et backup_artifacts (voir BACKUP_EXCLUDED_TABLES). Dupliquée avec
 * la liste SQL de export_backup_snapshot() (aucun mécanisme ne les unifie
 * dans ce lot) — la cohérence des deux est vérifiée par un test
 * d'intégration comparant cette liste au schéma réel (voir
 * backup-coverage.test.ts).
 */
export const BACKUP_TABLES = [
  "players",
  "opponents",
  "seasons",
  "team_settings",
  "matches",
  "match_players",
  "match_lineups",
  "match_equipment_items",
  "goals",
  "cards",
  "awards",
  "votes",
  "match_awards",
  "availability",
  "injuries",
  "dues",
  "player_measurements",
  "player_badges",
  "reinforcement_calls",
  "hall_of_fame_entries",
  "club_quotes",
  "jersey_history_entries",
  "monthly_mvp_votes",
  "season_trophies",
  "player_goals",
  "external_competitions",
  "external_standings",
  "opponent_external_mappings",
  "match_squad_entries",
  "player_restrictions",
  "venues",
  "match_templates",
] as const;

/** Tables du schéma public volontairement absentes de BACKUP_TABLES, avec la raison exacte (Lot 6, roadmap V3). */
export const BACKUP_EXCLUDED_TABLES: Record<string, string> = {
  audit_log: "journal append-only exporté séparément pour certains backups sensibles",
  backups: "évite la récursion des sauvegardes",
  backup_artifacts: "artefacts associés aux backups, exclus pour éviter la récursion",
};

/** Résolue à l'exécution depuis une liste de noms — pas typable statiquement, même choix que audit-actions.ts. */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/** Best-effort : NULL si la variable d'environnement est absente (ex. exécution locale) — jamais une erreur de création. */
function getApplicationCommit(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? null;
}

/** Best-effort : lit la dernière migration réellement appliquée à la base (pas seulement connue du dépôt). NULL si l'appel échoue. */
async function getDatabaseSchemaVersion(): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("get_latest_applied_migration");
  if (error || typeof data !== "string") return null;
  return data;
}

/** Best-effort : la saison active au moment du backup, ou null s'il n'y en a aucune — pas une anomalie. */
async function getActiveSeasonForBackup(): Promise<{ id: string; name: string } | null> {
  const { data } = await supabaseAdmin.from("seasons").select("id, name").eq("is_active", true).maybeSingle();
  return data ? { id: data.id, name: data.name } : null;
}

export type CreateBackupParams = {
  triggerReason: BackupTriggerReason;
  label: string;
  createdByPlayerId: string | null;
  /** Obligatoire — aucune valeur par défaut. Un oubli est une erreur de compilation, jamais un backup purgeable par accident. */
  protectedBackup: boolean;
  /** Renseigné uniquement pour les backups système/scripts (createdByPlayerId est null). */
  createdByContext?: string;
};

/**
 * Passe par la fonction Postgres export_backup_snapshot() (une seule
 * instruction SQL, snapshot cohérent garanti — voir la migration
 * 20260718110100 et le protocole à deux sessions consigné au compte rendu
 * du Lot 6). Renvoie la ligne créée (nécessaire à l'appelant pour, le cas
 * échéant, générer l'artefact audit_log associé avec le bon cutoff, ou
 * compenser par suppression si cet artefact obligatoire échoue).
 */
export async function createBackup(params: CreateBackupParams): Promise<Backup> {
  const { data: snapshot, error: rpcError } = await supabaseAdmin.rpc("export_backup_snapshot");
  if (rpcError) throw new Error(`Sauvegarde échouée : ${rpcError.message}`);

  const snapshotObj = snapshot as unknown as Record<string, unknown[]>;
  const tableCounts: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    tableCounts[table] = (snapshotObj[table] ?? []).length;
  }

  const [activeSeason, databaseSchemaVersion] = await Promise.all([
    getActiveSeasonForBackup(),
    getDatabaseSchemaVersion(),
  ]);

  const { data, error } = await supabaseAdmin
    .from("backups")
    .insert({
      label: params.label,
      trigger_reason: params.triggerReason,
      backup_type: backupTypeForTriggerReason(params.triggerReason),
      protected: params.protectedBackup,
      format_version: 2,
      snapshot: snapshot as Json,
      table_counts: tableCounts as Json,
      tables_included: [...BACKUP_TABLES],
      tables_excluded: Object.keys(BACKUP_EXCLUDED_TABLES),
      exclusion_reasons: BACKUP_EXCLUDED_TABLES as Json,
      checksum: computeChecksum(snapshot),
      checksum_algorithm: CHECKSUM_ALGORITHM,
      created_by_player_id: params.createdByPlayerId,
      created_by_context: params.createdByContext ?? null,
      application_commit: getApplicationCommit(),
      database_schema_version: databaseSchemaVersion,
      active_season_id: activeSeason?.id ?? null,
      active_season_name: activeSeason?.name ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return data;
}

/**
 * Métadonnées uniquement — jamais `snapshot`, jamais le contenu d'un
 * artefact. Sélection explicite des colonnes (pas de select('*')), pour
 * qu'aucun futur champ sensible ajouté à `backups` ne fuite silencieusement
 * vers un parcours accessible aux coachs.
 */
export type BackupMetadata = {
  id: string;
  label: string;
  trigger_reason: string;
  backup_type: string | null;
  protected: boolean | null;
  format_version: number | null;
  checksum: string | null;
  checksum_algorithm: string | null;
  table_counts: Json;
  tables_included: string[] | null;
  tables_excluded: string[] | null;
  active_season_name: string | null;
  application_commit: string | null;
  database_schema_version: string | null;
  created_by_player_id: string | null;
  created_by_context: string | null;
  created_at: string;
  createdByName: string | null;
};

const METADATA_COLUMNS =
  "id, label, trigger_reason, backup_type, protected, format_version, checksum, checksum_algorithm, table_counts, tables_included, tables_excluded, active_season_name, application_commit, database_schema_version, created_by_player_id, created_by_context, created_at";

/** Garde requireFreshCoach() intégrée ici (défense en profondeur, même principe que getBackupSnapshotForOwner) : un joueur ne doit jamais pouvoir atteindre cette fonction, même depuis un futur site d'appel qui oublierait de vérifier la permission en amont. */
export async function getBackupMetadata(): Promise<BackupMetadata[]> {
  await requireFreshCoach();

  const { data, error } = await supabaseAdmin
    .from("backups")
    .select(METADATA_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Omit<BackupMetadata, "createdByName">[];
  const playerIds = [...new Set(rows.map((b) => b.created_by_player_id).filter((id): id is string => !!id))];
  const { data: players } =
    playerIds.length > 0
      ? await supabaseAdmin.from("players").select("id, first_name, nickname").in("id", playerIds)
      : { data: [] as { id: string; first_name: string; nickname: string | null }[] };
  const nameById = new Map((players ?? []).map((p) => [p.id, p.nickname || p.first_name]));

  return rows.map((b) => ({
    ...b,
    createdByName: b.created_by_player_id ? (nameById.get(b.created_by_player_id) ?? null) : null,
  }));
}

/**
 * Contenu complet, y compris `snapshot` — la garde requireOwner() est portée
 * ICI, pas seulement par l'appelant (route/action) : un futur site d'appel
 * qui oublierait de vérifier la permission avant d'invoquer cette fonction
 * ne pourrait de toute façon jamais obtenir le contenu complet sans être
 * propriétaire. Défense en profondeur, pas une confiance aveugle envers
 * l'appelant.
 */
export async function getBackupSnapshotForOwner(backupId: string): Promise<Backup | null> {
  await requireOwner();
  const { data, error } = await supabaseAdmin.from("backups").select("*").eq("id", backupId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Même contenu complet que ci-dessus, mais gardée par requireFreshCoach()
 * (pas requireOwner()) — réservée à la vérification d'intégrité interne
 * (backups-actions.ts::checkBackupIntegrityAction), qui recalcule un
 * checksum côté serveur et ne renvoie jamais `snapshot` au client. Ne pas
 * utiliser pour un chemin qui exposerait le contenu tel quel (téléchargement,
 * export) — celui-là doit rester sur getBackupSnapshotForOwner ci-dessus.
 */
export async function getBackupSnapshotForIntegrityCheck(backupId: string): Promise<Backup | null> {
  await requireFreshCoach();
  const { data, error } = await supabaseAdmin.from("backups").select("*").eq("id", backupId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Même garde intégrée que getBackupSnapshotForOwner() ci-dessus, pour la même raison. */
export async function getBackupArtifactForOwner(artifactId: string): Promise<BackupArtifact | null> {
  await requireOwner();
  const { data, error } = await supabaseAdmin.from("backup_artifacts").select("*").eq("id", artifactId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Équivalent de getBackupSnapshotForIntegrityCheck() pour un artefact — même usage, même garde requireFreshCoach(). */
export async function getBackupArtifactForIntegrityCheck(artifactId: string): Promise<BackupArtifact | null> {
  await requireFreshCoach();
  const { data, error } = await supabaseAdmin.from("backup_artifacts").select("*").eq("id", artifactId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Métadonnées uniquement (jamais `payload`) — même garde intégrée que getBackupMetadata(). */
export async function getBackupArtifactsMetadata(backupId: string) {
  await requireFreshCoach();

  const { data, error } = await supabaseAdmin
    .from("backup_artifacts")
    .select("id, artifact_type, format_version, row_count, checksum, checksum_algorithm, source_cutoff_at, created_at")
    .eq("backup_id", backupId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Ne vérifie ni permission ni confirmation — appelée uniquement depuis une action serveur déjà gardée par requireOwner() + confirmation de libellé. */
export async function deleteBackupRow(backupId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("backups").delete().eq("id", backupId);
  if (error) throw new Error(error.message);
}

/** Compteurs actuels des mêmes tables, pour comparer une sauvegarde à l'état courant. */
export async function getLiveTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const { count, error } = await untypedDb.from(table).select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      counts[table] = count ?? 0;
    })
  );
  return counts;
}

export async function getLastBackupAge(): Promise<{ createdAt: string; daysAgo: number } | null> {
  const { data, error } = await supabaseAdmin
    .from("backups")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const daysAgo = Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24));
  return { createdAt: data.created_at, daysAgo };
}

/**
 * Génère l'artefact audit_log associé à un backup existant — jamais un
 * artefact "flottant" sans backup_id. Cutoff explicite (audit_log.created_at
 * <= backup.created_at) plutôt qu'une transaction combinée avec l'insertion
 * du backup (voir createBackupWithArtifacts pour la compensation en cas
 * d'échec sur un backup sensible).
 */
export async function createAuditLogArtifact(
  backupId: string,
  cutoffAt: string,
  createdByPlayerId: string | null
): Promise<BackupArtifact> {
  const { data: payload, error: rpcError } = await supabaseAdmin.rpc("export_audit_log_snapshot", {
    p_cutoff: cutoffAt,
  });
  if (rpcError) throw new Error(`Export audit_log échoué : ${rpcError.message}`);

  const rows = payload as unknown as unknown[];
  const { data, error } = await supabaseAdmin
    .from("backup_artifacts")
    .insert({
      backup_id: backupId,
      artifact_type: "audit_log",
      format_version: 2,
      row_count: rows.length,
      checksum: computeChecksum(payload),
      checksum_algorithm: CHECKSUM_ALGORITHM,
      payload: payload as Json,
      source_cutoff_at: cutoffAt,
      created_by_player_id: createdByPlayerId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

type AtomicCreationRow = {
  backup_id: string;
  backup_created_at: string;
  backup_snapshot: Json;
  artifact_id: string;
  artifact_payload: Json;
  artifact_row_count: number;
};

/**
 * Crée le backup ET son artefact audit_log dans UNE SEULE transaction
 * Postgres (RPC create_sensitive_backup_with_audit_artifact, migration
 * 20260718120000) : soit les deux lignes existent, soit aucune des deux —
 * garanti par le rollback automatique de la transaction sur toute erreur
 * SQL, pas par une compensation applicative. Les checksums (calculés en JS,
 * jamais dupliqués en SQL — voir le commentaire de la migration) sont
 * complétés juste après par une mise à jour : si cette étape échoue, les
 * deux lignes existent quand même (jamais orphelines), simplement avec un
 * statut "Non vérifié" jusqu'à la prochaine vérification.
 */
async function createBackupWithArtifactTransactional(
  params: CreateBackupParams
): Promise<{ backup: Backup; auditLogArtifact: BackupArtifact }> {
  const [activeSeason, databaseSchemaVersion] = await Promise.all([
    getActiveSeasonForBackup(),
    getDatabaseSchemaVersion(),
  ]);

  // Le générateur de types Supabase ne reflète pas la nullabilité réelle des
  // paramètres SQL (tous nullable en base, aucun `not null` déclaré) — cast
  // vers le client non typé pour ce seul appel, même pattern que `untypedDb`
  // plus haut dans ce fichier.
  const { data, error } = await (supabaseAdmin as unknown as SupabaseClient).rpc("create_sensitive_backup_with_audit_artifact", {
    p_label: params.label,
    p_trigger_reason: params.triggerReason,
    p_backup_type: backupTypeForTriggerReason(params.triggerReason),
    p_protected: params.protectedBackup,
    p_created_by_player_id: params.createdByPlayerId,
    p_created_by_context: params.createdByContext ?? null,
    p_application_commit: getApplicationCommit(),
    p_database_schema_version: databaseSchemaVersion,
    p_active_season_id: activeSeason?.id ?? null,
    p_active_season_name: activeSeason?.name ?? null,
  });
  if (error) throw new Error(`Création transactionnelle échouée : ${error.message}`);

  const row = (data as unknown as AtomicCreationRow[])[0];

  const backupChecksum = computeChecksum(row.backup_snapshot);
  const artifactChecksum = computeChecksum(row.artifact_payload);

  // Persistance atomique des deux checksums (migration 20260718130000) :
  // remplace les deux UPDATE séparés précédents (risque d'un backup au
  // format 2 avec un checksum renseigné et son artefact resté NULL, ou
  // l'inverse, en cas de crash entre les deux). Si cet appel échoue, les
  // deux lignes existent déjà (garanti par la transaction de création
  // ci-dessus) mais restent "à finaliser" — état géré explicitement par le
  // modèle d'intégrité, jamais confondu avec un backup legacy, réparable via
  // repairBackupIntegrityAction (backups-actions.ts).
  const { error: finalizeError } = await (supabaseAdmin as unknown as SupabaseClient).rpc(
    "finalize_sensitive_backup_checksums",
    {
      p_backup_id: row.backup_id,
      p_backup_checksum: backupChecksum,
      p_artifact_checksum: artifactChecksum,
    }
  );
  if (finalizeError) throw new Error(`Finalisation des checksums échouée : ${finalizeError.message}`);

  const [{ data: backup, error: backupError }, { data: auditLogArtifact, error: artifactError }] = await Promise.all([
    supabaseAdmin.from("backups").select("*").eq("id", row.backup_id).single(),
    supabaseAdmin.from("backup_artifacts").select("*").eq("id", row.artifact_id).single(),
  ]);
  if (backupError) throw new Error(backupError.message);
  if (artifactError) throw new Error(artifactError.message);

  return { backup, auditLogArtifact };
}

/**
 * Orchestration : pour les trigger_reason "sensibles" (before_restore,
 * before_migration, before_fusion), passe par le chemin transactionnel
 * ci-dessus (backup + artefact garantis ensemble). Pour tous les autres,
 * simple création du backup, sans artefact.
 */
export async function createBackupWithArtifacts(
  params: CreateBackupParams
): Promise<{ backup: Backup; auditLogArtifact: BackupArtifact | null }> {
  if (requiresAuditLogArtifact(params.triggerReason)) {
    return createBackupWithArtifactTransactional(params);
  }

  const backup = await createBackup(params);
  return { backup, auditLogArtifact: null };
}
