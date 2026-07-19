import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 18 — insert_goals_batch()/cancel_goals_batch() : le
 * scénario exact du cahier des charges (match 4-2 : joueur A 2 buts, joueur
 * B 1 but, 1 CSC adverse, passes facultatives, double soumission,
 * annulation du lot, restauration de l'état précédent). Projet isolé
 * exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

const KEY = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function batchParams(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    p_match_id: ids.match3,
    p_idempotency_key: KEY,
    p_scorer_entries: [
      { player_id: ids.p1, is_unknown_scorer: false, count: 2 },
      { player_id: ids.p2, is_unknown_scorer: false, count: 1 },
    ],
    p_csc_adverse_count: 1,
    p_csc_charenton_entries: [],
    p_assist_entries: [{ player_id: ids.p3, count: 2 }],
    p_opponent_score: 2,
    p_changed_by_player_id: ids.owner,
    p_changed_by_name: "Test",
    ...overrides,
  };
}

describe("insert_goals_batch — match 4-2 (scénario du cahier des charges)", () => {
  it("insère les 4 buts, dérive le score, attribue les passes", async () => {
    const { data, error } = await admin.rpc("insert_goals_batch", batchParams());
    expect(error).toBeNull();
    expect(data![0].result_inserted_count).toBe(4);
    expect(data![0].result_team_score).toBe(4);

    const { data: match } = await admin.from("matches").select("status, team_score, opponent_score, completion_status").eq("id", ids.match3).single();
    expect(match).toEqual({ status: "completed", team_score: 4, opponent_score: 2, completion_status: "incomplete" });

    const { data: goals } = await admin.from("goals").select("scorer_player_id, assist_player_id, goal_type, credited_to").eq("match_id", ids.match3).is("deleted_at", null);
    expect(goals!.length).toBe(4);
    expect(goals!.filter((g) => g.scorer_player_id === ids.p1).length).toBe(2);
    expect(goals!.filter((g) => g.scorer_player_id === ids.p2).length).toBe(1);
    expect(goals!.filter((g) => g.goal_type === "csc" && g.credited_to === "charenton").length).toBe(1);
    expect(goals!.filter((g) => g.assist_player_id === ids.p3).length).toBe(2);
  });

  it("double soumission (même idempotency_key) : succès silencieux, aucune ligne dupliquée", async () => {
    const { data, error } = await admin.rpc("insert_goals_batch", batchParams());
    expect(error).toBeNull();
    expect(data![0].result_inserted_count).toBe(4);

    const { count } = await admin.from("goals").select("*", { count: "exact", head: true }).eq("match_id", ids.match3).is("deleted_at", null);
    expect(count).toBe(4);
  });

  it("annulation du lot : restaure l'état précédent (scheduled, score vidé, buts retirés)", async () => {
    const batchId = (await admin.from("goals").select("batch_id").eq("match_id", ids.match3).not("batch_id", "is", null).limit(1).single()).data!.batch_id;

    const { error } = await admin.rpc("cancel_goals_batch", { p_match_id: ids.match3, p_batch_id: batchId, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test" });
    expect(error).toBeNull();

    const { data: match } = await admin.from("matches").select("status, team_score, opponent_score, completion_status").eq("id", ids.match3).single();
    expect(match).toEqual({ status: "scheduled", team_score: null, opponent_score: null, completion_status: "not_started" });

    const { count } = await admin.from("goals").select("*", { count: "exact", head: true }).eq("match_id", ids.match3).is("deleted_at", null);
    expect(count).toBe(0);
  });

  it("indisponible pour un match déjà terminé (Lot 9's match1, seedé completed)", async () => {
    const { error } = await admin.rpc("insert_goals_batch", batchParams({ p_match_id: ids.match1, p_idempotency_key: "cccccccc-cccc-cccc-cccc-cccccccccccc" }));
    expect(error?.message).toMatch(/pas encore terminé/i);
  });
});

describe("Sécurité — anon refusé", () => {
  it("insert_goals_batch et cancel_goals_batch", async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const r1 = await anon.rpc("insert_goals_batch", batchParams({ p_match_id: ZERO_UUID, p_idempotency_key: "dddddddd-dddd-dddd-dddd-dddddddddddd" }));
    expect(r1.error?.message).toMatch(/permission denied/i);
    const r2 = await anon.rpc("cancel_goals_batch", { p_match_id: ZERO_UUID, p_batch_id: ZERO_UUID, p_changed_by_player_id: null, p_changed_by_name: "x" });
    expect(r2.error?.message).toMatch(/permission denied/i);
  });
});
