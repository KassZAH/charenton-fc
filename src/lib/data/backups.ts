import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Backup, BackupTriggerReason } from "@/types/models";
import type { Json } from "@/types/database";

/**
 * Toutes les tables de données sauvegardées, à l'exception de audit_log
 * (déjà un historique en soi) et backups elle-même.
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
] as const;

/** Résolue à l'exécution depuis une liste de noms — pas typable statiquement, même choix que audit-actions.ts. */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export async function createBackup(
  reason: BackupTriggerReason,
  label: string,
  createdByPlayerId: string | null
): Promise<void> {
  const snapshot: Record<string, unknown[]> = {};
  const tableCounts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    const { data, error } = await untypedDb.from(table).select("*");
    if (error) throw new Error(`Sauvegarde échouée sur ${table} : ${error.message}`);
    snapshot[table] = data ?? [];
    tableCounts[table] = (data ?? []).length;
  }

  const { error } = await supabaseAdmin.from("backups").insert({
    label,
    trigger_reason: reason,
    snapshot: snapshot as Json,
    table_counts: tableCounts as Json,
    created_by_player_id: createdByPlayerId,
  });
  if (error) throw new Error(error.message);
}

export type BackupSummary = Omit<Backup, "snapshot"> & { createdByName: string | null };

export async function getBackups(): Promise<BackupSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("backups")
    .select("id, label, trigger_reason, table_counts, created_by_player_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const playerIds = [...new Set((data ?? []).map((b) => b.created_by_player_id).filter((id): id is string => !!id))];
  const { data: players } =
    playerIds.length > 0
      ? await supabaseAdmin.from("players").select("id, first_name, nickname").in("id", playerIds)
      : { data: [] as { id: string; first_name: string; nickname: string | null }[] };
  const nameById = new Map((players ?? []).map((p) => [p.id, p.nickname || p.first_name]));

  return (data ?? []).map((b) => ({
    ...b,
    createdByName: b.created_by_player_id ? nameById.get(b.created_by_player_id) ?? null : null,
  }));
}

export async function getBackupSnapshot(backupId: string): Promise<Backup | null> {
  const { data, error } = await supabaseAdmin.from("backups").select("*").eq("id", backupId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
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
