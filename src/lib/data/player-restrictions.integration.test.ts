import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getActiveRestriction, getActiveRestrictionsByPlayerId, getPlayerRestrictionHistory } from "./player-restrictions";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 19) — player_restrictions : une seule restriction active par
 * joueur (index unique partiel), clôture, historique, RLS activée sans policy (service_role
 * uniquement). Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("player_restrictions — création et contraintes", () => {
  it("crée une restriction active et la retrouve via getActiveRestriction", async () => {
    const { error } = await admin.from("player_restrictions").insert({
      player_id: ids.p1,
      restriction_types: ["progressive_return", "no_intense_running"],
      visibility: "coaches",
      created_by_player_id: ids.owner,
    });
    expect(error).toBeNull();

    const active = await getActiveRestriction(ids.p1);
    expect(active).not.toBeNull();
    expect(active!.restriction_types).toContain("progressive_return");
    expect(active!.status).toBe("active");
  });

  it("refuse une deuxième restriction active en parallèle pour le même joueur", async () => {
    const { error } = await admin.from("player_restrictions").insert({
      player_id: ids.p1,
      restriction_types: ["no_goalkeeper"],
      visibility: "team",
    });
    expect(error).not.toBeNull();
  });

  it("refuse un type de restriction hors de la liste autorisée", async () => {
    const { error } = await admin.from("player_restrictions").insert({
      player_id: ids.p2,
      restriction_types: ["not_a_real_type"],
      visibility: "team",
    });
    expect(error).not.toBeNull();
  });

  it("refuse un tableau de types vide", async () => {
    const { error } = await admin.from("player_restrictions").insert({
      player_id: ids.p2,
      restriction_types: [],
      visibility: "team",
    });
    expect(error).not.toBeNull();
  });

  it("clôture : status='ended' sort de getActiveRestriction mais reste dans l'historique", async () => {
    const active = await getActiveRestriction(ids.p1);
    const { error } = await admin
      .from("player_restrictions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", active!.id);
    expect(error).toBeNull();

    expect(await getActiveRestriction(ids.p1)).toBeNull();
    const history = await getPlayerRestrictionHistory(ids.p1);
    expect(history.some((r) => r.id === active!.id && r.status === "ended")).toBe(true);
  });

  it("après clôture, une nouvelle restriction active peut être créée pour le même joueur", async () => {
    const { error } = await admin.from("player_restrictions").insert({
      player_id: ids.p1,
      restriction_types: ["limited_play_time"],
      visibility: "private",
    });
    expect(error).toBeNull();
    const active = await getActiveRestriction(ids.p1);
    expect(active?.restriction_types).toEqual(["limited_play_time"]);
  });

  it("getActiveRestrictionsByPlayerId regroupe toutes les restrictions actives par joueur", async () => {
    const map = await getActiveRestrictionsByPlayerId();
    expect(map.get(ids.p1)?.restriction_types).toEqual(["limited_play_time"]);
    expect(map.has(ids.p2)).toBe(false);
  });
});

describe("player_restrictions — RLS", () => {
  it("RLS activée : un client anon/authenticated ne peut rien lire sans policy explicite", async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return;
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey);
    const { data, error } = await anonClient.from("player_restrictions").select("*").limit(1);
    // RLS sans policy = aucune ligne renvoyée (jamais une erreur bloquante, jamais de fuite).
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
