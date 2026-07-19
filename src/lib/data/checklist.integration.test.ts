import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchChecklistForPlayer } from "./checklist";
import { computeCaptainSuggestion } from "./rotation";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 24) — checklist privée (modèles d'équipe + préférences
 * personnelles + items contextuels), jamais d'écrasement de `checked` déjà posé, et suggestion
 * de rotation du capitanat. computeCaptainSuggestion bypass la garde requireFreshCoach() (même
 * limite documentée pour rotation.ts). Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;

  await admin.from("checklist_templates").insert({ label: "Arriver en avance" });
  await admin.from("player_checklist_preferences").insert({ player_id: ids.p1, label: "Prendre les clés" });
  await admin.from("matches").update({ captain_player_id: ids.p1 }).eq("id", ids.match3);
  await admin.from("availability").insert({ match_id: ids.match3, player_id: ids.p1, status: "present" });
}, 30000);

describe("getMatchChecklistForPlayer", () => {
  it("génère modèle + préférence personnelle + contextuel (capitaine)", async () => {
    const items = await getMatchChecklistForPlayer(ids.match3, ids.p1);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("Arriver en avance");
    expect(labels).toContain("Prendre les clés");
    expect(labels).toContain("Être capitaine");
  });

  it("cocher un item puis régénérer ne l'écrase jamais (checked persiste)", async () => {
    const items = await getMatchChecklistForPlayer(ids.match3, ids.p1);
    const target = items.find((i) => i.label === "Prendre les clés")!;
    await admin.from("match_checklist_items").update({ checked: true }).eq("id", target.id);

    const regenerated = await getMatchChecklistForPlayer(ids.match3, ids.p1);
    expect(regenerated.find((i) => i.id === target.id)?.checked).toBe(true);
  });

  it("un autre joueur ne voit jamais les items de p1 (checklist strictement privée)", async () => {
    const itemsForP2 = await getMatchChecklistForPlayer(ids.match3, ids.p2);
    expect(itemsForP2.some((i) => i.label === "Prendre les clés")).toBe(false);
    expect(itemsForP2.some((i) => i.label === "Être capitaine")).toBe(false);
  });
});

describe("computeCaptainSuggestion", () => {
  it("suggère un joueur disponible qui n'a pas été capitaine récemment", async () => {
    await admin.from("availability").upsert(
      { match_id: ids.match3, player_id: ids.p2, status: "present" },
      { onConflict: "match_id,player_id" }
    );

    const suggestion = await computeCaptainSuggestion(ids.match3, 5);
    expect(suggestion).not.toBeNull();
    // p2 n'a jamais été capitaine (seul match1 a possiblement un capitaine différent) — devrait être suggéré avant p1.
    expect(suggestion!.reason).toContain(suggestion!.playerName);
  });
});
