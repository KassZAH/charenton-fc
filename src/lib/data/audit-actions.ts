"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked, isMatchScopedTable, matchIdFromDeletedRowSnapshot } from "./season-lock";

type TrackedTable = "matches" | "goals" | "cards" | "players";
const SOFT_DELETE_TABLES = new Set<TrackedTable>(["goals", "cards"]);

/**
 * Restaurer une modification touche une table connue seulement à l'exécution
 * (résolue depuis audit_log.table_name) — impossible à typer statiquement
 * avec le client Supabase généré. On bascule volontairement sur un client
 * non typé pour cette portion, seul endroit du code où c'est nécessaire.
 */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

/**
 * Résout le match réellement concerné par une entrée d'historique. Ne fait
 * jamais confiance à l'instantané old_data seul quand une lecture fraîche de
 * l'enregistrement est possible : old_data ne sert que pour une suppression
 * annulée, où la ligne n'existe plus nulle part ailleurs.
 */
async function resolveMatchId(
  tableName: TrackedTable,
  recordId: string,
  action: string,
  oldData: Record<string, unknown> | null
): Promise<string | null> {
  if (tableName === "matches") return recordId;
  if (!isMatchScopedTable(tableName)) return null;

  if (action === "delete") {
    return matchIdFromDeletedRowSnapshot(oldData);
  }

  const { data } = await untypedDb.from(tableName).select("match_id").eq("id", recordId).maybeSingle();
  const matchId = (data as { match_id?: string } | null)?.match_id;
  return typeof matchId === "string" ? matchId : null;
}

export async function restoreChange(auditLogId: string) {
  await requireAdmin();

  const { data: entry, error } = await supabaseAdmin
    .from("audit_log")
    .select("*")
    .eq("id", auditLogId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!entry) throw new Error("Entrée introuvable.");
  if (entry.restored_at) throw new Error("Déjà restauré.");

  const tableName = entry.table_name as TrackedTable;
  const recordId = entry.record_id;
  const oldData = entry.old_data as Record<string, unknown> | null;

  // Un transfert de propriété a ses propres règles (joueur actif, promotion
  // en coach, révocation des deux sessions) — un simple retour en arrière du
  // champ owner_player_id les contournerait toutes. Refait via une nouvelle
  // action de transfert, jamais via l'historique générique.
  if (entry.table_name === "team_settings") {
    throw new Error("Un transfert de propriété ne se restaure pas depuis l'historique — utilise un nouveau transfert.");
  }

  if (isMatchScopedTable(tableName)) {
    const matchId = await resolveMatchId(tableName, recordId, entry.action, oldData);
    if (matchId) await assertMatchSeasonUnlocked(matchId);
  }

  if (entry.action === "insert") {
    // Annuler une création : soft-delete si la table le supporte, sinon suppression réelle.
    if (SOFT_DELETE_TABLES.has(tableName)) {
      const { error: undoError } = await untypedDb
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", recordId);
      if (undoError) throw new Error(undoError.message);
    } else {
      const { error: undoError } = await untypedDb.from(tableName).delete().eq("id", recordId);
      if (undoError) throw new Error(undoError.message);
    }
  } else if (entry.action === "delete") {
    // Annuler une suppression : réactiver le soft-delete, ou réinsérer si suppression réelle.
    if (SOFT_DELETE_TABLES.has(tableName)) {
      const { error: undoError } = await untypedDb
        .from(tableName)
        .update({ deleted_at: null })
        .eq("id", recordId);
      if (undoError) throw new Error(undoError.message);
    } else if (oldData) {
      const { error: undoError } = await untypedDb.from(tableName).insert(oldData);
      if (undoError) throw new Error(undoError.message);
    }
  } else if (entry.action === "update") {
    if (!oldData) throw new Error("Pas de valeur précédente à restaurer.");
    const { error: undoError } = await untypedDb.from(tableName).update(oldData).eq("id", recordId);
    if (undoError) throw new Error(undoError.message);
  }

  const { error: markError } = await supabaseAdmin
    .from("audit_log")
    .update({ restored_at: new Date().toISOString() })
    .eq("id", auditLogId);
  if (markError) throw new Error(markError.message);

  revalidatePath("/history");
  revalidatePath("/matches");
  revalidatePath("/stats");
  revalidatePath("/team");
}
