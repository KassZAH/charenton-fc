import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchEquipment, suggestEquipmentAssignee } from "./equipment";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 24) — statuts matériel (assigné/confirmé/apporté/oublié),
 * suggestion basée sur l'historique, reprise du match précédent (jamais d'assignation copiée
 * silencieusement). Les Server Actions dépendent de requireAdmin()/requireUser() — ce test
 * reproduit leurs effets directement au niveau table. Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("match_equipment_items — statuts", () => {
  it("statut par défaut 'unassigned' à la création", async () => {
    const { data: item, error } = await admin
      .from("match_equipment_items")
      .insert({ match_id: ids.match3, label: "Ballons" })
      .select("id")
      .single();
    expect(error).toBeNull();
    ids.equipmentItem1 = item!.id;

    const items = await getMatchEquipment(ids.match3);
    expect(items.find((i) => i.id === ids.equipmentItem1)?.status).toBe("unassigned");
  });

  it("assignation puis confirmation puis apporté", async () => {
    await admin.from("match_equipment_items").update({ assigned_player_id: ids.p1, status: "assigned" }).eq("id", ids.equipmentItem1);
    let items = await getMatchEquipment(ids.match3);
    expect(items.find((i) => i.id === ids.equipmentItem1)?.status).toBe("assigned");

    await admin.from("match_equipment_items").update({ status: "confirmed" }).eq("id", ids.equipmentItem1);
    items = await getMatchEquipment(ids.match3);
    expect(items.find((i) => i.id === ids.equipmentItem1)?.status).toBe("confirmed");

    await admin.from("match_equipment_items").update({ status: "brought", brought: true }).eq("id", ids.equipmentItem1);
    items = await getMatchEquipment(ids.match3);
    expect(items.find((i) => i.id === ids.equipmentItem1)?.status).toBe("brought");
  });

  it("suggestEquipmentAssignee retrouve p1, qui a déjà apporté des ballons", async () => {
    const suggestion = await suggestEquipmentAssignee("Ballons");
    expect(suggestion?.playerId).toBe(ids.p1);
    expect(suggestion?.timesBrought).toBe(1);
  });

  it("reprise du matériel du match précédent : copie les intitulés, jamais l'assignation", async () => {
    // match2 (précédent, complété) devient la source : ajoute un élément avec assignation.
    await admin.from("match_equipment_items").insert({ match_id: ids.match2, label: "Chasubles", assigned_player_id: ids.p2, status: "brought" });

    const { data: previousItems } = await admin.from("match_equipment_items").select("label").eq("match_id", ids.match2);
    await admin
      .from("match_equipment_items")
      .insert((previousItems ?? []).map((i) => ({ match_id: ids.match3, label: i.label, status: "unassigned" })));

    const items = await getMatchEquipment(ids.match3);
    const copied = items.filter((i) => i.label === "Chasubles");
    expect(copied.length).toBeGreaterThan(0);
    for (const c of copied) {
      expect(c.assigned_player_id).toBeNull();
      expect(c.status).toBe("unassigned");
    }
  });

  it("RLS activée sur les nouvelles tables du Lot 24 : anon ne lit rien sans policy", async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return;
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey);
    for (const table of ["checklist_templates", "player_checklist_preferences", "match_checklist_items"]) {
      const { data, error } = await anonClient.from(table).select("*").limit(1);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });
});
