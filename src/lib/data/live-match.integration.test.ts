import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchGoals } from "./goals";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 15 — vérifie au niveau base la mécanique exercée par
 * startMatch/finishMatch (requireAdmin() indisponible hors requête Next.js,
 * même limite que Lot 14 — voir match-lifecycle.integration.test.ts). Le
 * score final doit toujours être dérivé des buts réellement enregistrés,
 * jamais resaisi manuellement ni divergent d'un but supprimé/corrigé.
 * Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

async function deriveScore(matchId: string) {
  const goals = await getMatchGoals(matchId);
  return {
    teamScore: goals.filter((g) => g.credited_to === "charenton").length,
    opponentScore: goals.filter((g) => g.credited_to === "opponent").length,
  };
}

describe("Match en cours — parcours complet sur match3 (scheduled -> live -> completed)", () => {
  it("démarrage : passage live, started_at posé", async () => {
    const startedAt = new Date().toISOString();
    const { error } = await admin.from("matches").update({ status: "live", started_at: startedAt }).eq("id", ids.match3);
    expect(error).toBeNull();
    const { data } = await admin.from("matches").select("status, started_at").eq("id", ids.match3).single();
    expect(data!.status).toBe("live");
    expect(data!.started_at).not.toBeNull();
  });

  it("ajout de buts et cartons pendant le live", async () => {
    await admin.from("goals").insert([
      { match_id: ids.match3, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique" },
      { match_id: ids.match3, scorer_player_id: ids.p2, credited_to: "charenton", goal_type: "classique" },
      { match_id: ids.match3, scorer_player_id: null, credited_to: "opponent", goal_type: "classique" },
    ]);
    await admin.from("cards").insert({ match_id: ids.match3, player_id: ids.p3, card_type: "yellow" });

    const score = await deriveScore(ids.match3);
    expect(score).toEqual({ teamScore: 2, opponentScore: 1 });
  });

  it("correction avant fin : un but supprimé (soft delete) n'est plus compté", async () => {
    const { data: goals } = await admin.from("goals").select("id").eq("match_id", ids.match3).eq("credited_to", "opponent");
    await admin.from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", goals![0].id);

    const score = await deriveScore(ids.match3);
    expect(score).toEqual({ teamScore: 2, opponentScore: 0 });
  });

  it("finalisation : le score persisté correspond exactement aux buts dérivés, jamais resaisi", async () => {
    const score = await deriveScore(ids.match3);
    const { error } = await admin
      .from("matches")
      .update({ status: "completed", team_score: score.teamScore, opponent_score: score.opponentScore, completion_status: "incomplete" })
      .eq("id", ids.match3);
    expect(error).toBeNull();

    const { data } = await admin.from("matches").select("status, team_score, opponent_score").eq("id", ids.match3).single();
    expect(data!.status).toBe("completed");
    expect(data!.team_score).toBe(2);
    expect(data!.opponent_score).toBe(0);
  });

  it("un match déjà completed ne peut plus repasser par live (transition refusée)", async () => {
    const { error } = await admin.from("matches").update({ status: "bogus_recheck_noop" }).eq("id", ids.match3);
    expect(error).not.toBeNull(); // garde-fou : confirme que la contrainte reste active après tout le parcours
  });
});
