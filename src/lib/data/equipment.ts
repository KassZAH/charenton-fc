import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { MatchEquipmentItem } from "@/types/models";

export type EquipmentItemWithName = MatchEquipmentItem & { assignedPlayerName: string | null };

export async function getMatchEquipment(matchId: string): Promise<EquipmentItemWithName[]> {
  const [players, { data, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin
      .from("match_equipment_items")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return (data ?? []).map((item) => ({
    ...item,
    assignedPlayerName: item.assigned_player_id ? (nameById.get(item.assigned_player_id) ?? null) : null,
  }));
}
