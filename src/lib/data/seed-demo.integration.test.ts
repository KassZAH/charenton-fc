import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { computeRotationSuggestions, computeCaptainSuggestion, getPlayerReliabilitySignals } from "./rotation";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seedDemo } = require("../../../scripts/isolated-env/seed-demo.js");

/**
 * Roadmap V3, Macro-release B (amélioration du dataset de démonstration) — vérifie que
 * `npm run seed:isolated:demo` produit exactement le dataset riche attendu par le protocole de
 * validation utilisateur : 14 comptes, 20 matchs répartis, historique suffisant pour la
 * rotation/fiabilité, deadlines variées, terrains/modèles, covoiturage, matériel et checklist.
 * Idempotent : un second seed ne doit laisser aucun résidu (mêmes comptes exacts). Projet isolé
 * exclusivement (guard.js, réutilisé par seed-demo.js).
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await seedDemo();
  ids = result.ids;
}, 60000);

describe("seed-demo — comptes et matchs", () => {
  it("14 joueurs actifs (1 propriétaire + 2 coachs + 11 joueurs)", async () => {
    const { data, error } = await admin.from("players").select("id, role, status").eq("status", "active");
    expect(error).toBeNull();
    expect(data).toHaveLength(14);
    expect(data!.filter((p) => p.role === "coach")).toHaveLength(3);
    expect(data!.filter((p) => p.role === "player")).toHaveLength(11);
  });

  it("au moins 2 joueurs au poste Gardien", async () => {
    const { data } = await admin.from("players").select("id").eq("primary_position", "Gardien");
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("exactement 20 matchs, répartis comme attendu", async () => {
    const { data, error } = await admin.from("matches").select("id, status").is("deleted_at", null);
    expect(error).toBeNull();
    expect(data).toHaveLength(20);

    const byStatus = new Map<string, number>();
    for (const m of data!) byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1);
    expect(byStatus.get("completed")).toBe(10);
    expect((byStatus.get("cancelled") ?? 0) + (byStatus.get("postponed") ?? 0)).toBe(3);
    // 5 ouverts + 1 deadline dépassée + 1 scénario principal = 7 matchs "scheduled".
    expect(byStatus.get("scheduled")).toBe(7);
  });

  it("suffisamment de matchs terminés pour alimenter la rotation (lookback par défaut = 5)", async () => {
    const { data } = await admin.from("matches").select("id").eq("status", "completed");
    expect((data ?? []).length).toBeGreaterThanOrEqual(5);
  });
});

describe("seed-demo — ponctualité et restrictions", () => {
  it("au moins une réponse tardive (late_response=true)", async () => {
    const { data } = await admin.from("availability").select("id").eq("late_response", true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("au moins une restriction active, une clôturée, et un retour progressif", async () => {
    const { data, error } = await admin.from("player_restrictions").select("status, restriction_types");
    expect(error).toBeNull();
    expect((data ?? []).some((r) => r.status === "active")).toBe(true);
    expect((data ?? []).some((r) => r.status === "ended")).toBe(true);
    expect((data ?? []).some((r) => r.restriction_types.includes("progressive_return"))).toBe(true);
  });
});

describe("seed-demo — terrains, modèles, covoiturage, matériel, checklist", () => {
  it("au moins 4 terrains et 3 modèles", async () => {
    const venues = await admin.from("venues").select("id");
    const templates = await admin.from("match_templates").select("id");
    expect((venues.data ?? []).length).toBeGreaterThanOrEqual(4);
    expect((templates.data ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("covoiturage présent avec au moins une affectation", async () => {
    const { data } = await admin.from("carpool_assignments").select("id");
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("matériel et checklist présents", async () => {
    const equipment = await admin.from("match_equipment_items").select("id");
    const checklist = await admin.from("match_checklist_items").select("id");
    expect((equipment.data ?? []).length).toBeGreaterThan(0);
    expect((checklist.data ?? []).length).toBeGreaterThan(0);
  });
});

describe("seed-demo — aide à la rotation compréhensible (pas une liste vide)", () => {
  it("computeRotationSuggestions signale un joueur disponible mais rarement retenu", async () => {
    const suggestions = await computeRotationSuggestions(ids.mainScenarioMatch, 5);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.reason.length > 0)).toBe(true);
  });

  it("computeCaptainSuggestion renvoie une suggestion explicable", async () => {
    const suggestion = await computeCaptainSuggestion(ids.mainScenarioMatch, 5);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.reason.length).toBeGreaterThan(0);
  });

  it("getPlayerReliabilitySignals distingue un joueur fiable d'un joueur en retard", async () => {
    const reliable = await getPlayerReliabilitySignals(ids.p5, 8);
    const late = await getPlayerReliabilitySignals(ids.p6, 8);
    expect(reliable.respondsOnTimeRate).not.toBeNull();
    expect(late.respondsOnTimeRate).not.toBeNull();
    expect(reliable.respondsOnTimeRate!).toBeGreaterThan(late.respondsOnTimeRate!);
  });
});

describe("seed-demo — idempotence", () => {
  it("un second seed ne laisse aucun résidu (mêmes comptes exacts)", async () => {
    await seedDemo();

    const players = await admin.from("players").select("id").eq("status", "active");
    const matches = await admin.from("matches").select("id").is("deleted_at", null);
    const venues = await admin.from("venues").select("id");
    const templates = await admin.from("match_templates").select("id");

    expect(players.data).toHaveLength(14);
    expect(matches.data).toHaveLength(20);
    expect((venues.data ?? []).length).toBe(4);
    expect((templates.data ?? []).length).toBe(3);
  }, 60000);
});
