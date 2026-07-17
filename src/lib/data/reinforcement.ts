import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ReinforcementCall } from "@/types/models";

function isActive(call: ReinforcementCall): boolean {
  if (call.revoked_at) return false;
  if (call.expires_at && new Date(call.expires_at) < new Date()) return false;
  return true;
}

export async function getReinforcementCallsForMatch(matchId: string): Promise<ReinforcementCall[]> {
  const { data, error } = await supabaseAdmin
    .from("reinforcement_calls")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublicReinforcementCall = {
  call: ReinforcementCall;
  matchDate: string;
  kickoffTime: string | null;
  location: string | null;
  opponentName: string | null;
  homeOrAway: string | null;
};

/** Pour la page publique — n'expose que ce qui est utile à un renfort potentiel, pas la fiche complète du match. */
export async function getPublicReinforcementCall(token: string): Promise<PublicReinforcementCall | null> {
  if (!UUID_RE.test(token)) return null;

  const { data: call, error } = await supabaseAdmin
    .from("reinforcement_calls")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!call || !isActive(call)) return null;

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("match_date, kickoff_time, location, home_or_away, opponent_id")
    .eq("id", call.match_id)
    .maybeSingle();
  if (matchError) throw new Error(matchError.message);
  if (!match) return null;

  let opponentName: string | null = null;
  if (match.opponent_id) {
    const { data: opponent } = await supabaseAdmin
      .from("opponents")
      .select("name")
      .eq("id", match.opponent_id)
      .maybeSingle();
    opponentName = opponent?.name ?? null;
  }

  return {
    call,
    matchDate: match.match_date,
    kickoffTime: match.kickoff_time,
    location: match.location,
    opponentName,
    homeOrAway: match.home_or_away,
  };
}
