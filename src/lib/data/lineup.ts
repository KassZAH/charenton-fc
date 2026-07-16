import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { FormationKey } from "@/lib/formations";

export type MatchLineup = {
  formation: FormationKey;
  positions: Record<string, string>;
};

export async function getMatchLineup(matchId: string): Promise<MatchLineup | null> {
  const { data, error } = await supabaseAdmin
    .from("match_lineups")
    .select("formation, positions")
    .eq("match_id", matchId)
    .maybeSingle();

  if (error) {
    // La table peut ne pas encore exister (migration pas encore lancée) — fonctionnalité
    // annexe, ne doit jamais casser la fiche match.
    return null;
  }
  if (!data) return null;

  return {
    formation: data.formation as FormationKey,
    positions: (data.positions as Record<string, string> | null) ?? {},
  };
}
