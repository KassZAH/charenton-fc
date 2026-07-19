import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 16 — vérifie au niveau base que l'index unique partiel
 * (match_id, idempotency_key) absorbe réellement un double envoi (double-clic)
 * sans dupliquer le but/carton, et que deux clés différentes pour deux
 * événements distincts s'insèrent normalement en parallèle (concurrence
 * réelle, pas seulement séquentielle). Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("Idempotence des buts — double soumission de la même clé", () => {
  it("la même idempotency_key envoyée deux fois n'insère qu'une seule ligne", async () => {
    const key = "11111111-1111-1111-1111-111111111111";
    const first = await admin.from("goals").insert({
      match_id: ids.match3, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique", idempotency_key: key,
    });
    expect(first.error).toBeNull();

    const second = await admin.from("goals").insert({
      match_id: ids.match3, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique", idempotency_key: key,
    });
    expect(second.error?.code).toBe("23505");

    const { count } = await admin.from("goals").select("*", { count: "exact", head: true }).eq("match_id", ids.match3).eq("idempotency_key", key);
    expect(count).toBe(1);
  });

  it("deux buts distincts (deux joueurs différents) avec deux clés différentes s'insèrent tous les deux, même envoyés en parallèle", async () => {
    const results = await Promise.all([
      admin.from("goals").insert({ match_id: ids.match3, scorer_player_id: ids.p2, credited_to: "charenton", goal_type: "classique", idempotency_key: "22222222-2222-2222-2222-222222222222" }),
      admin.from("goals").insert({ match_id: ids.match3, scorer_player_id: ids.p3, credited_to: "charenton", goal_type: "classique", idempotency_key: "33333333-3333-3333-3333-333333333333" }),
    ]);
    expect(results.every((r) => r.error === null)).toBe(true);
  });

  it("les lignes historiques sans idempotency_key (NULL) ne se bloquent jamais entre elles", async () => {
    const results = await Promise.all([
      admin.from("goals").insert({ match_id: ids.match3, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique" }),
      admin.from("goals").insert({ match_id: ids.match3, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique" }),
    ]);
    expect(results.every((r) => r.error === null)).toBe(true);
  });
});

describe("Idempotence des cartons — même mécanique", () => {
  it("la même idempotency_key envoyée deux fois n'insère qu'un seul carton", async () => {
    const key = "44444444-4444-4444-4444-444444444444";
    const first = await admin.from("cards").insert({ match_id: ids.match3, player_id: ids.p1, card_type: "yellow", idempotency_key: key });
    expect(first.error).toBeNull();

    const second = await admin.from("cards").insert({ match_id: ids.match3, player_id: ids.p1, card_type: "yellow", idempotency_key: key });
    expect(second.error?.code).toBe("23505");

    const { count } = await admin.from("cards").select("*", { count: "exact", head: true }).eq("match_id", ids.match3).eq("idempotency_key", key);
    expect(count).toBe(1);
  });
});
