import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import { formatMatchDate, formatShortDate } from "@/lib/format";

export type TrashedMatch = { id: string; label: string; deletedAt: string };
export type TrashedGoal = { id: string; matchId: string; label: string; deletedAt: string };
export type TrashedCard = { id: string; matchId: string; label: string; deletedAt: string };

export async function getTrashedMatches(): Promise<TrashedMatch[]> {
  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, match_date, opponent_id, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);

  const opponentIds = [...new Set((matches ?? []).map((m) => m.opponent_id).filter((id): id is string => !!id))];
  const { data: opponents } =
    opponentIds.length > 0
      ? await supabaseAdmin.from("opponents").select("id, name").in("id", opponentIds)
      : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((opponents ?? []).map((o) => [o.id, o.name]));

  return (matches ?? []).map((m) => ({
    id: m.id,
    label: `vs ${m.opponent_id ? nameById.get(m.opponent_id) ?? "Adversaire" : "Adversaire"} (${formatMatchDate(m.match_date)})`,
    deletedAt: m.deleted_at!,
  }));
}

export async function getTrashedGoals(): Promise<TrashedGoal[]> {
  const [players, { data: goals, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin
      .from("goals")
      .select("id, match_id, scorer_player_id, minute, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return (goals ?? []).map((g) => ({
    id: g.id,
    matchId: g.match_id,
    label: `${g.scorer_player_id ? nameById.get(g.scorer_player_id) ?? "Joueur" : "Buteur inconnu"} — ${g.minute}'`,
    deletedAt: g.deleted_at!,
  }));
}

export async function getTrashedCards(): Promise<TrashedCard[]> {
  const [players, { data: cards, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin
      .from("cards")
      .select("id, match_id, player_id, card_type, minute, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return (cards ?? []).map((c) => ({
    id: c.id,
    matchId: c.match_id,
    label: `${c.card_type === "red" ? "🟥" : "🟨"} ${(c.player_id && nameById.get(c.player_id)) ?? "Joueur"} — ${c.minute}'`,
    deletedAt: c.deleted_at!,
  }));
}

export function formatDeletedAt(iso: string): string {
  return formatShortDate(iso);
}
