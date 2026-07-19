import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/clock";
import type { Match } from "@/types/models";

export type MatchWithOpponent = Match & { opponent_name: string | null };

export async function attachOpponents(matches: Match[]): Promise<MatchWithOpponent[]> {
  const opponentIds = [
    ...new Set(matches.map((m) => m.opponent_id).filter((id): id is string => !!id)),
  ];

  if (opponentIds.length === 0) {
    return matches.map((m) => ({ ...m, opponent_name: null }));
  }

  const { data: opponents, error } = await supabaseAdmin
    .from("opponents")
    .select("id, name")
    .in("id", opponentIds);
  if (error) throw new Error(error.message);

  const nameById = new Map((opponents ?? []).map((o) => [o.id, o.name]));
  return matches.map((m) => ({
    ...m,
    opponent_name: m.opponent_id ? (nameById.get(m.opponent_id) ?? null) : null,
  }));
}

// 'live' et 'postponed' restent "à venir" (Lot 14) : un match en cours ou reporté ne doit jamais
// disparaître silencieusement de ces listes — seuls 'cancelled' et 'draft' en sont exclus.
const UPCOMING_STATUSES = ["scheduled", "live", "postponed"] as const;

export async function getNextMatch(): Promise<MatchWithOpponent | null> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .in("status", UPCOMING_STATUSES)
    .is("deleted_at", null)
    .gte("match_date", todayDateString())
    .order("match_date", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  const [withOpponent] = await attachOpponents(data);
  return withOpponent;
}

export async function getUpcomingMatches(): Promise<MatchWithOpponent[]> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .in("status", UPCOMING_STATUSES)
    .is("deleted_at", null)
    .gte("match_date", todayDateString())
    .order("match_date", { ascending: true });
  if (error) throw new Error(error.message);
  return attachOpponents(data ?? []);
}

/** Matchs "scheduled" dont la date est déjà passée — oubliés, jamais finalisés. Réservé aux admins. */
export async function getUnfinalizedPastMatches(): Promise<MatchWithOpponent[]> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("status", "scheduled")
    .is("deleted_at", null)
    .lt("match_date", todayDateString())
    .order("match_date", { ascending: false });
  if (error) throw new Error(error.message);
  return attachOpponents(data ?? []);
}

export async function getPastMatches(): Promise<MatchWithOpponent[]> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("match_date", { ascending: false });
  if (error) throw new Error(error.message);
  return attachOpponents(data ?? []);
}

export async function getMatchById(id: string): Promise<MatchWithOpponent | null> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [withOpponent] = await attachOpponents([data]);
  return withOpponent;
}
