import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchGoalkeepers } from "./roster";
import { getMatchReadiness } from "./match-readiness";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 13 — set_match_goalkeepers() : désignation réelle,
 * plusieurs gardiens, refus d'un joueur hors feuille de match, mise à jour
 * de la readiness une fois une vraie désignation posée. Projet isolé
 * exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("set_match_goalkeepers — match1 (feuille de match déjà confirmée : p1, p2, p3)", () => {
  it("refuse un joueur absent de la feuille de match", async () => {
    const { error } = await admin.rpc("set_match_goalkeepers", {
      p_match_id: ids.match1,
      p_goalkeeper_player_ids: [ZERO_UUID],
    });
    expect(error?.message).toMatch(/feuille de match/i);
    expect(await getMatchGoalkeepers(ids.match1)).toEqual([]);
  });

  it("désigne un gardien réel parmi la feuille de match", async () => {
    const { error } = await admin.rpc("set_match_goalkeepers", {
      p_match_id: ids.match1,
      p_goalkeeper_player_ids: [ids.p1],
    });
    expect(error).toBeNull();
    expect(await getMatchGoalkeepers(ids.match1)).toEqual([ids.p1]);
  });

  it("plusieurs gardiens possibles simultanément", async () => {
    const { error } = await admin.rpc("set_match_goalkeepers", {
      p_match_id: ids.match1,
      p_goalkeeper_player_ids: [ids.p1, ids.p2],
    });
    expect(error).toBeNull();
    const gks = await getMatchGoalkeepers(ids.match1);
    expect(new Set(gks)).toEqual(new Set([ids.p1, ids.p2]));
  });

  it("remplace intégralement la désignation précédente (jamais un cumul silencieux)", async () => {
    const { error } = await admin.rpc("set_match_goalkeepers", {
      p_match_id: ids.match1,
      p_goalkeeper_player_ids: [ids.p3],
    });
    expect(error).toBeNull();
    expect(await getMatchGoalkeepers(ids.match1)).toEqual([ids.p3]);
  });

  it("liste vide -> retire toute désignation", async () => {
    const { error } = await admin.rpc("set_match_goalkeepers", {
      p_match_id: ids.match1,
      p_goalkeeper_player_ids: [],
    });
    expect(error).toBeNull();
    expect(await getMatchGoalkeepers(ids.match1)).toEqual([]);
  });
});

describe("getMatchReadiness — priorité à la désignation réelle une fois posée (match3)", () => {
  it("sans désignation réelle : repli documenté sur le poste principal", async () => {
    await admin.from("availability").insert({ match_id: ids.match3, player_id: ids.p1, status: "present" });
    await admin.from("players").update({ primary_position: "Gardien" }).eq("id", ids.p1);
    const readiness = await getMatchReadiness(ids.match3);
    expect(readiness.hasGoalkeeper).toBe(true);
  });

  it("dès qu'une feuille de match existe avec une désignation réelle, elle prime sur le poste principal", async () => {
    // p2 devient gardien réel sur la feuille de match3 (même si p1, présent, a le poste "Gardien").
    await admin.from("match_players").insert({ match_id: ids.match3, player_id: ids.p2, was_present: true, goalkeeper: true });
    const readiness = await getMatchReadiness(ids.match3);
    // p1 (poste Gardien) est présent mais pas désigné ; p2 est désigné mais pas "présent" (availability) ->
    // la désignation réelle est la seule source de vérité désormais, jamais un mélange des deux logiques.
    expect(readiness.hasGoalkeeper).toBe(false);

    await admin.from("availability").insert({ match_id: ids.match3, player_id: ids.p2, status: "present" });
    const resolved = await getMatchReadiness(ids.match3);
    expect(resolved.hasGoalkeeper).toBe(true);
  });
});
