"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertMatchSeasonUnlocked, isMatchScopedTable, matchIdFromDeletedRowSnapshot } from "./season-lock";

type TrackedTable = "matches" | "goals" | "cards" | "players";

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

/**
 * Restauration transactionnelle (Lot 8, roadmap V3, RPC
 * restore_audit_entry_transactional, migration 20260720000100) : verrou
 * explicite sur l'entrée d'historique, refus d'une double restauration,
 * allow-list stricte de colonnes par table (jamais old_data appliqué tel
 * quel — corrige un écart de sécurité de l'ancienne implémentation, qui
 * restaurait pin_hash/pin_length/session_version pour une fiche joueur),
 * marquage restored_at dans la même transaction. Le verrouillage de saison
 * reste vérifié ici, avant l'appel RPC : c'est une règle applicative
 * (assertMatchSeasonUnlocked), pas une question d'atomicité de la
 * restauration elle-même.
 */
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

  if (isMatchScopedTable(tableName)) {
    const matchId = await resolveMatchId(tableName, recordId, entry.action, oldData);
    if (matchId) await assertMatchSeasonUnlocked(matchId);
  }

  const { error: rpcError } = await untypedDb.rpc("restore_audit_entry_transactional", {
    p_audit_log_id: auditLogId,
  });
  if (rpcError) throw new Error(rpcError.message);

  revalidatePath("/history");
  revalidatePath("/matches");
  revalidatePath("/stats");
  revalidatePath("/team");
}
