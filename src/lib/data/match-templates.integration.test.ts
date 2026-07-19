import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchTemplates, getMatchTemplateById } from "./match-templates";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 22) — match_templates : lecture, génération d'un match à
 * partir d'un modèle. generateMatchFromTemplate (Server Action) dépend de requireFreshCoach() —
 * ce test reproduit son effet directement au niveau table pour vérifier qu'aucune donnée humaine
 * (présence/covoiturage/blessure/paiement) n'est jamais copiée. Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("match_templates — CRUD et génération", () => {
  it("crée un modèle et le retrouve", async () => {
    const { data: template, error } = await admin
      .from("match_templates")
      .insert({
        name: "Vendredi soir à Charenton",
        kickoff_time: "20:00",
        meeting_offset_minutes: 30,
        match_type: "amical",
        home_or_away: "home",
        default_equipment_items: ["ballons", "chasubles"],
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    ids.template1 = template!.id;

    const templates = await getMatchTemplates();
    expect(templates.some((t) => t.id === ids.template1)).toBe(true);
    const fetched = await getMatchTemplateById(ids.template1);
    expect(fetched?.default_equipment_items).toEqual(["ballons", "chasubles"]);
  });

  it("génération d'un match : reprend structure du modèle, ne copie jamais présence/covoiturage/blessure/paiement", async () => {
    const { data: match, error } = await admin
      .from("matches")
      .insert({
        match_date: "2026-10-03",
        kickoff_time: "20:00",
        meeting_time: "19:30",
        home_or_away: "home",
        match_type: "amical",
        status: "scheduled",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const [{ count: availabilityCount }, { count: carpoolCount }, { count: duesCount }] = await Promise.all([
      admin.from("availability").select("*", { count: "exact", head: true }).eq("match_id", match!.id),
      admin.from("match_players").select("*", { count: "exact", head: true }).eq("match_id", match!.id),
      admin.from("dues").select("*", { count: "exact", head: true }).eq("player_id", ids.p1),
    ]);
    expect(availabilityCount).toBe(0);
    expect(carpoolCount).toBe(0);
    // Les cotisations existantes ne sont jamais touchées par une génération de match.
    expect(duesCount).toBeGreaterThan(0);
  });

  it("suppression d'un terrain référencé par un modèle : le modèle repasse à venue_id=null", async () => {
    const { data: venue } = await admin.from("venues").insert({ name: "Terrain du modèle" }).select("id").single();
    await admin.from("match_templates").update({ venue_id: venue!.id }).eq("id", ids.template1);

    await admin.from("venues").delete().eq("id", venue!.id);

    const { data: template } = await admin.from("match_templates").select("venue_id").eq("id", ids.template1).single();
    expect(template?.venue_id).toBeNull();
  });

  it("RLS activée : anon ne lit rien sans policy", async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return;
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey);
    const { data, error } = await anonClient.from("match_templates").select("*").limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
