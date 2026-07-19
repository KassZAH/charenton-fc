import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { computeRotationSuggestions, getPlayerReliabilitySignals, computeCollectiveResponseTrend } from "./rotation";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 21) — suggestion de rotation expliquée (jamais un score public,
 * jamais une sélection automatique), signaux de fiabilité privés, tendance collective. Projet isolé
 * exclusivement. Construit 3 matchs complémentaires (les plus récents) où p3 est disponible mais
 * jamais retenu, pour obtenir un écart net et déterministe.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;

  const extraMatchDates = ["2026-09-10", "2026-09-11", "2026-09-12"];
  const extraMatchIds: string[] = [];
  for (const date of extraMatchDates) {
    const { data: match, error } = await admin
      .from("matches")
      .insert({
        season_id: ids.season, opponent_id: ids.opponent, match_date: date,
        match_type: "amical", home_or_away: "home", team_score: 1, opponent_score: 0, status: "completed",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    extraMatchIds.push(match.id);

    // p3 se déclare présent mais n'est jamais retenu en feuille de match ; p1 joue à chaque fois.
    await admin.from("availability").insert([
      { match_id: match.id, player_id: ids.p3, status: "present", first_responded_at: `${date}T10:00:00Z`, last_changed_at: `${date}T10:00:00Z`, late_response: false },
      { match_id: match.id, player_id: ids.p1, status: "present", first_responded_at: `${date}T09:00:00Z`, last_changed_at: `${date}T09:00:00Z`, late_response: true },
    ]);
    await admin.from("match_players").insert([{ match_id: match.id, player_id: ids.p1, was_present: true }]);
  }
  ids.extraMatch1 = extraMatchIds[0];
  ids.extraMatch2 = extraMatchIds[1];
  ids.extraMatch3 = extraMatchIds[2];

  // p3 également disponible pour le match courant (scheduled) auquel la suggestion s'applique.
  await admin.from("availability").insert({ match_id: ids.match3, player_id: ids.p3, status: "present" });
}, 30000);

describe("getRotationSuggestions", () => {
  it("suggère p3 (disponible 3 fois, jamais retenu) avec une raison explicite, jamais un score", async () => {
    const suggestions = await computeRotationSuggestions(ids.match3, 3);
    const p3 = suggestions.find((s) => s.playerId === ids.p3);
    expect(p3).toBeDefined();
    expect(p3!.recentAvailableCount).toBe(3);
    expect(p3!.recentPlayedCount).toBe(0);
    expect(p3!.reason).toContain("disponible lors des 3 derniers matchs");
  });

  it("n'inclut jamais un joueur indisponible pour le match courant", async () => {
    // p2 n'a pas répondu "présent" pour ids.match3 (aucune réponse posée dans ce test) — jamais suggéré.
    const suggestions = await computeRotationSuggestions(ids.match3, 3);
    expect(suggestions.some((s) => s.playerId === ids.p2)).toBe(false);
  });
});

describe("getPlayerReliabilitySignals", () => {
  it("p3 : répond toujours à temps mais ne joue jamais après s'être dit présent (fiabilité de suivi basse)", async () => {
    const signals = await getPlayerReliabilitySignals(ids.p3, 3);
    expect(signals.respondsOnTimeRate).toBe(100);
    expect(signals.presenceConsistencyRate).toBe(0);
  });

  it("null (jamais 0) sans historique du tout", async () => {
    const signals = await getPlayerReliabilitySignals(ids.p2, 0);
    expect(signals.respondsOnTimeRate).toBeNull();
    expect(signals.presenceConsistencyRate).toBeNull();
  });
});

describe("getCollectiveResponseTrend", () => {
  it("agrège sans nommer de joueur", async () => {
    const trend = await computeCollectiveResponseTrend(3);
    expect(trend.matchesConsidered).toBe(3);
    expect(trend.onTimeRate).not.toBeNull();
    expect(typeof trend.onTimeRate).toBe("number");
  });
});
