import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatShortDateOnly } from "@/lib/format";
import type { Injury } from "@/types/models";

export async function getActiveInjury(playerId: string): Promise<Injury | null> {
  const { data, error } = await supabaseAdmin
    .from("injuries")
    .select("*")
    .eq("player_id", playerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Toutes les blessures actives, groupées par joueur — utile pour les vues qui listent plusieurs joueurs à la fois. */
export async function getActiveInjuriesByPlayerId(): Promise<Map<string, Injury>> {
  const { data, error } = await supabaseAdmin.from("injuries").select("*").eq("status", "active");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((injury) => [injury.player_id, injury]));
}

export async function getPlayerInjuryHistory(playerId: string): Promise<Injury[]> {
  const { data, error } = await supabaseAdmin
    .from("injuries")
    .select("*")
    .eq("player_id", playerId)
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Label à afficher pour "Présent" sur un match donné : null si le match n'est pas couvert par
 * cette blessure, "" si couvert mais durée inconnue, sinon la date de retour formatée.
 */
export function injuryReturnLabelForDate(injury: Injury | null | undefined, matchDate: string): string | null {
  if (!injury) return null;
  const covers = !injury.estimated_return_date || matchDate <= injury.estimated_return_date;
  if (!covers) return null;
  return injury.estimated_return_date ? formatShortDateOnly(injury.estimated_return_date) : "";
}
