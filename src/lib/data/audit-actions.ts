"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

type TrackedTable = "matches" | "goals" | "cards" | "players";
const SOFT_DELETE_TABLES = new Set<TrackedTable>(["goals", "cards"]);

/**
 * Restaurer une modification touche une table connue seulement à l'exécution
 * (résolue depuis audit_log.table_name) — impossible à typer statiquement
 * avec le client Supabase généré. On bascule volontairement sur un client
 * non typé pour cette portion, seul endroit du code où c'est nécessaire.
 */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

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
