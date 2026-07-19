import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMatchEquipment } from "./equipment";
import { getMyDue } from "./dues";
import type { ChecklistTemplate, PlayerChecklistPreference, MatchChecklistItem } from "@/types/models";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export type ContextualSignals = {
  isCaptain: boolean;
  assignedEquipmentLabels: string[];
  hasUnpaidDues: boolean;
};

/**
 * Items générés selon le contexte du match (§7.4, roadmap V2 ; Lot 24) — jamais stockés tant que
 * la checklist du joueur n'a pas été (re)générée pour ce match précis. Fonction pure, testable
 * sans base.
 */
export function buildContextualLabels(signals: ContextualSignals): string[] {
  const labels: string[] = [];
  if (signals.isCaptain) labels.push("Être capitaine");
  for (const item of signals.assignedEquipmentLabels) labels.push(`Apporter : ${item}`);
  if (signals.hasUnpaidDues) labels.push("Cotisation restante");
  return labels;
}

/** `includeDemo=true` réservé aux écrans du Mode Démo — jamais un rappel fictif dans la checklist réelle par défaut. */
export async function getChecklistTemplates(includeDemo = false): Promise<ChecklistTemplate[]> {
  let query = untypedDb.from("checklist_templates").select("*");
  if (!includeDemo) query = query.eq("is_demo", false);

  const { data, error } = await query.order("label", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlayerChecklistPreferences(playerId: string): Promise<PlayerChecklistPreference[]> {
  const { data, error } = await untypedDb
    .from("player_checklist_preferences")
    .select("*")
    .eq("player_id", playerId)
    .order("label", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getContextualSignals(matchId: string, playerId: string): Promise<ContextualSignals> {
  const [match, equipment] = await Promise.all([
    supabaseAdmin.from("matches").select("captain_player_id, season_id").eq("id", matchId).maybeSingle(),
    getMatchEquipment(matchId),
  ]);
  if (match.error) throw new Error(match.error.message);

  const assignedEquipmentLabels = equipment.filter((e) => e.assigned_player_id === playerId).map((e) => e.label);
  const due = match.data?.season_id ? await getMyDue(match.data.season_id, playerId) : null;

  return {
    isCaptain: match.data?.captain_player_id === playerId,
    assignedEquipmentLabels,
    hasUnpaidDues: !!due && due.amountPaid < due.amountDue,
  };
}

/**
 * Génère (si nécessaire) puis renvoie la checklist privée d'un joueur pour un match : modèles
 * d'équipe + préférences personnelles + items contextuels. N'écrase jamais `checked` d'un item
 * déjà présent — seuls les libellés manquants sont insérés à chaque appel.
 */
export async function getMatchChecklistForPlayer(matchId: string, playerId: string): Promise<MatchChecklistItem[]> {
  const [templates, preferences, signals, existing] = await Promise.all([
    getChecklistTemplates(),
    getPlayerChecklistPreferences(playerId),
    getContextualSignals(matchId, playerId),
    untypedDb.from("match_checklist_items").select("*").eq("match_id", matchId).eq("player_id", playerId),
  ]);
  if (existing.error) throw new Error(existing.error.message);

  const existingLabels = new Set((existing.data ?? []).map((r: MatchChecklistItem) => r.label));

  const toInsert: { match_id: string; player_id: string; label: string; source: "template" | "personal" | "contextual" }[] = [];
  for (const t of templates) {
    if (!existingLabels.has(t.label)) toInsert.push({ match_id: matchId, player_id: playerId, label: t.label, source: "template" });
  }
  for (const p of preferences) {
    if (!existingLabels.has(p.label)) toInsert.push({ match_id: matchId, player_id: playerId, label: p.label, source: "personal" });
  }
  for (const label of buildContextualLabels(signals)) {
    if (!existingLabels.has(label)) toInsert.push({ match_id: matchId, player_id: playerId, label, source: "contextual" });
  }

  if (toInsert.length > 0) {
    const { error } = await untypedDb.from("match_checklist_items").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  const { data: finalRows, error: finalError } = await untypedDb
    .from("match_checklist_items")
    .select("*")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .order("created_at", { ascending: true });
  if (finalError) throw new Error(finalError.message);
  return finalRows ?? [];
}
