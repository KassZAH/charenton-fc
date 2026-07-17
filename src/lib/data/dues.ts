import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";

export type PlayerDue = {
  playerId: string;
  name: string;
  amountDue: number;
  amountPaid: number;
};

export async function getSeasonDues(seasonId: string): Promise<PlayerDue[]> {
  const [players, { data: rows, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("dues").select("player_id, amount_due, amount_paid").eq("season_id", seasonId),
  ]);
  if (error) throw new Error(error.message);

  const byPlayerId = new Map((rows ?? []).map((r) => [r.player_id, r]));

  return players.map((p) => {
    const row = byPlayerId.get(p.id);
    return {
      playerId: p.id,
      name: p.nickname || p.first_name,
      amountDue: row?.amount_due ?? 0,
      amountPaid: row?.amount_paid ?? 0,
    };
  });
}

export type MyDue = { amountDue: number; amountPaid: number };

/** Cotisation d'un seul joueur — pour sa propre page et l'alerte d'accueil, jamais celle des autres. */
export async function getMyDue(seasonId: string, playerId: string): Promise<MyDue | null> {
  const { data: row, error } = await supabaseAdmin
    .from("dues")
    .select("amount_due, amount_paid")
    .eq("season_id", seasonId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  return { amountDue: row.amount_due, amountPaid: row.amount_paid };
}
