import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchReadiness } from "./match-readiness";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 12 — vérifie que getMatchReadiness distingue toujours un
 * état "pas encore configuré" (aucune réponse) d'un manque réel, et que
 * chaque alerte disparaît progressivement à mesure que le manque est résolu.
 * Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("getMatchReadiness — match3 (scheduled, aucune réponse à l'origine)", () => {
  it("aucune réponse -> awaitingResponses=true, aucune alerte effectif/gardien (jamais un faux manque)", async () => {
    const readiness = await getMatchReadiness(ids.match3);
    expect(readiness.awaitingResponses).toBe(true);
    expect(readiness.respondedCount).toBe(0);
    expect(readiness.warnings).toEqual([]);
  });

  it("une réponse 'présent' sans gardien -> alertes effectif et gardien apparaissent", async () => {
    await admin.from("availability").insert({ match_id: ids.match3, player_id: ids.p1, status: "present" });
    const readiness = await getMatchReadiness(ids.match3);
    expect(readiness.awaitingResponses).toBe(false);
    expect(readiness.hasGoalkeeper).toBe(false);
    expect(readiness.enoughPlayers).toBe(false);
    expect(readiness.warnings).toContain("Aucun gardien confirmé");
    expect(readiness.warnings.some((w) => w.includes("confirmé"))).toBe(true);
  });

  it("désigner un gardien (poste principal) -> l'alerte gardien disparaît, l'effectif reste insuffisant", async () => {
    await admin.from("players").update({ primary_position: "Gardien" }).eq("id", ids.p1);
    const readiness = await getMatchReadiness(ids.match3);
    expect(readiness.hasGoalkeeper).toBe(true);
    expect(readiness.warnings).not.toContain("Aucun gardien confirmé");
    expect(readiness.enoughPlayers).toBe(false);
  });

  it("matériel non assigné -> alerte matérielle indépendante de l'effectif", async () => {
    const { data: item } = await admin
      .from("match_equipment_items")
      .insert({ match_id: ids.match3, label: "Ballons" })
      .select("id")
      .single();
    const readiness = await getMatchReadiness(ids.match3);
    expect(readiness.unassignedEquipment).toContain("Ballons");
    expect(readiness.warnings).toContain("Personne n'apporte : Ballons");

    await admin.from("match_equipment_items").update({ assigned_player_id: ids.p1 }).eq("id", item!.id);
    const resolved = await getMatchReadiness(ids.match3);
    expect(resolved.unassignedEquipment).toEqual([]);
    expect(resolved.warnings).not.toContain("Personne n'apporte : Ballons");
  });

  it("covoiturage insuffisant -> alerte ; place disponible ajoutée -> alerte résolue", async () => {
    await admin.from("availability").update({ needs_ride: true }).eq("match_id", ids.match3).eq("player_id", ids.p1);
    const readiness = await getMatchReadiness(ids.match3);
    expect(readiness.carpoolSufficient).toBe(false);
    expect(readiness.warnings).toContain("Pas assez de places en covoiturage");

    await admin.from("availability").insert({ match_id: ids.match3, player_id: ids.p2, status: "present", can_drive: true, available_seats: 2 });
    const resolved = await getMatchReadiness(ids.match3);
    expect(resolved.carpoolSufficient).toBe(true);
    expect(resolved.warnings).not.toContain("Pas assez de places en covoiturage");
  });
});
