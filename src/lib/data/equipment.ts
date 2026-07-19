import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { MatchEquipmentItem, EquipmentStatus } from "@/types/models";

export type EquipmentItemWithName = MatchEquipmentItem & {
  assignedPlayerName: string | null;
  status: EquipmentStatus;
};

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
    status: item.status as EquipmentStatus,
    assignedPlayerName: item.assigned_player_id ? (nameById.get(item.assigned_player_id) ?? null) : null,
  }));
}

/**
 * Suggestion privée (coach) — qui a le plus souvent apporté cet élément par le passé, jamais une
 * réassignation automatique et silencieuse (Lot 24, roadmap V3) : une simple indication, l'admin
 * valide toujours explicitement en assignant lui-même.
 */
export async function suggestEquipmentAssignee(label: string): Promise<{ playerId: string; playerName: string; timesBrought: number } | null> {
  const [players, { data, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("match_equipment_items").select("assigned_player_id").eq("label", label).eq("status", "brought"),
  ]);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.assigned_player_id) continue;
    counts.set(row.assigned_player_id, (counts.get(row.assigned_player_id) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const [playerId, timesBrought] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  return { playerId, playerName: player.nickname || player.first_name, timesBrought };
}
