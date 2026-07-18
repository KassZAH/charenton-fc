import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAllPlayers } from "./players";
import type { Card, CardType } from "@/types/models";

export type CardWithName = Card & { player_name: string };

export async function getMatchCards(matchId: string): Promise<CardWithName[]> {
  const [players, { data: cards, error }] = await Promise.all([
    getAllPlayers(),
    supabaseAdmin
      .from("cards")
      .select("*")
      .eq("match_id", matchId)
      .is("deleted_at", null)
      .order("minute", { ascending: true, nullsFirst: false }),
  ]);
  if (error) throw new Error(error.message);

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return (cards ?? []).map((c) => ({
    ...c,
    player_name: c.player_id ? (nameById.get(c.player_id) ?? "Joueur") : "Joueur inconnu",
  }));
}

export async function getPlayerCardCounts(playerId: string): Promise<Record<CardType, number>> {
  const { data, error } = await supabaseAdmin
    .from("cards")
    .select("card_type")
    .eq("player_id", playerId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  const counts: Record<CardType, number> = { yellow: 0, red: 0 };
  for (const c of data ?? []) {
    if (c.card_type === "yellow" || c.card_type === "red") counts[c.card_type]++;
  }
  return counts;
}
