import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchSquad } from "./match-squad";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 17 — set_match_squad()/unlock_match_squad() : préparation,
 * publication+verrouillage, refus de modification une fois verrouillé,
 * déverrouillage, gardien prévu contraint aux convoqués, présence réelle
 * (match_players/availability) totalement indépendante du groupe convoqué.
 * Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("set_match_squad — préparation puis publication", () => {
  it("brouillon (p_publish=false) : pas encore publié, modifiable", async () => {
    const { error } = await admin.rpc("set_match_squad", {
      p_match_id: ids.match3, p_called_up_player_ids: [ids.p1, ids.p2], p_waitlist_player_ids: [ids.p3],
      p_planned_goalkeeper_player_id: ids.p1, p_publish: false, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();

    const squad = await getMatchSquad(ids.match3);
    expect(new Set(squad.calledUpPlayerIds)).toEqual(new Set([ids.p1, ids.p2]));
    expect(squad.waitlistPlayerIds).toEqual([ids.p3]);
    expect(squad.plannedGoalkeeperPlayerId).toBe(ids.p1);
    expect(squad.publishedAt).toBeNull();
    expect(squad.lockedAt).toBeNull();
  });

  it("le gardien prévu doit être parmi les convoqués", async () => {
    const { error } = await admin.rpc("set_match_squad", {
      p_match_id: ids.match3, p_called_up_player_ids: [ids.p1], p_waitlist_player_ids: [],
      p_planned_goalkeeper_player_id: ids.p2, p_publish: false, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error?.message).toMatch(/convoqué/i);
  });

  it("publication : verrouille, lecture Joueur possible via getMatchSquad", async () => {
    const { error } = await admin.rpc("set_match_squad", {
      p_match_id: ids.match3, p_called_up_player_ids: [ids.p1, ids.p2], p_waitlist_player_ids: [ids.p3],
      p_planned_goalkeeper_player_id: ids.p1, p_publish: true, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();

    const squad = await getMatchSquad(ids.match3);
    expect(squad.publishedAt).not.toBeNull();
    expect(squad.lockedAt).not.toBeNull();
  });

  it("modification interdite une fois verrouillé", async () => {
    const { error } = await admin.rpc("set_match_squad", {
      p_match_id: ids.match3, p_called_up_player_ids: [ids.p1, ids.p2, ids.p3], p_waitlist_player_ids: [],
      p_planned_goalkeeper_player_id: null, p_publish: false, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error?.message).toMatch(/verrouillé/i);

    // La composition publiée n'a pas bougé.
    const squad = await getMatchSquad(ids.match3);
    expect(new Set(squad.calledUpPlayerIds)).toEqual(new Set([ids.p1, ids.p2]));
  });

  it("déverrouillage par le Coach/Propriétaire puis modification effective", async () => {
    const unlock = await admin.rpc("unlock_match_squad", { p_match_id: ids.match3, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test" });
    expect(unlock.error).toBeNull();

    const { error } = await admin.rpc("set_match_squad", {
      p_match_id: ids.match3, p_called_up_player_ids: [ids.p1, ids.p2, ids.p3], p_waitlist_player_ids: [],
      p_planned_goalkeeper_player_id: null, p_publish: false, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();

    const squad = await getMatchSquad(ids.match3);
    expect(new Set(squad.calledUpPlayerIds)).toEqual(new Set([ids.p1, ids.p2, ids.p3]));
    expect(squad.lockedAt).toBeNull(); // déverrouillé, modification en brouillon (p_publish=false)
  });

  it("audit : chaque publication/déverrouillage laisse une trace sans contenu sensible", async () => {
    const { data } = await admin
      .from("audit_log")
      .select("new_data")
      .eq("table_name", "matches")
      .eq("record_id", ids.match3)
      .order("created_at", { ascending: false })
      .limit(5);
    const squadActions = data!.map((r) => (r.new_data as { squad_action?: string }).squad_action).filter(Boolean);
    expect(squadActions).toContain("published");
    expect(squadActions).toContain("unlocked");
  });
});

describe("Présence réelle indépendante du groupe convoqué", () => {
  it("marquer un joueur non convoqué comme réellement présent (match_players) ne modifie jamais le groupe convoqué", async () => {
    const before = await getMatchSquad(ids.match1);
    await admin.from("match_players").insert({ match_id: ids.match1, player_id: ids.p1, was_present: true }).select().maybeSingle();
    const after = await getMatchSquad(ids.match1);
    expect(after).toEqual(before);
  });
});

describe("Sécurité", () => {
  it("anon refusé sur les deux RPC (déjà couvert par rpc-security, revérifié ici dans le contexte du lot)", async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const r1 = await anon.rpc("set_match_squad", {
      p_match_id: ZERO_UUID, p_called_up_player_ids: [], p_waitlist_player_ids: [],
      p_planned_goalkeeper_player_id: null, p_publish: false, p_changed_by_player_id: null, p_changed_by_name: "x",
    });
    expect(r1.error?.message).toMatch(/permission denied/i);
    const r2 = await anon.rpc("unlock_match_squad", { p_match_id: ZERO_UUID, p_changed_by_player_id: null, p_changed_by_name: "x" });
    expect(r2.error?.message).toMatch(/permission denied/i);
  });
});
