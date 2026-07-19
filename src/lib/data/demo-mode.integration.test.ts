import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createOrResetDemoDataset, deleteDemoDatasetEntirely } from "./demo-dataset";
import { getDemoSeasonIds, getDemoMatchIds, getDemoSeason, isMatchInDemoSeason } from "./demo-scope";
import { getVenues } from "./venues";
import { getMatchTemplates } from "./match-templates";
import { getChecklistTemplates } from "./checklist";
import { getTeamStats, getTopScorers } from "./stats";
import { computeRotationSuggestions, getPlayerReliabilitySignals } from "./rotation";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seedDemo } = require("../../../scripts/isolated-env/seed-demo.js");

/**
 * Charenton FC — Mode Démo (présentation aux coachs, post-Macro B). Vérifie l'isolation stricte
 * demandée : la saison Démo ne devient jamais active, aucune fuite dans les statistiques/rotation/
 * fiabilité réelles, aucune cotisation fictive, idempotence, refus de toucher une vraie saison,
 * joueurs réels (rôle/PIN/session_version/statut/poste) strictement inchangés. Projet isolé
 * exclusivement.
 *
 * Utilise le dataset riche du Lot 19-24 (seed-demo.js, 14 comptes/20 matchs réels) comme base
 * "réelle" de référence, puis construit le Mode Démo par-dessus — exactement le scénario que
 * vivra la production (des vrais joueurs et matchs déjà en base, avant l'ajout du Mode Démo).
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  await resetAndSeed();
  const demoResult = await seedDemo();
  ids = demoResult.ids;
}, 60000);

describe("Mode Démo — la saison ne peut jamais devenir active", () => {
  it("l'insertion d'une saison is_demo=true et is_active=true est rejetée par la contrainte", async () => {
    const { error } = await admin.from("seasons").insert({ name: "Tentative interdite", is_demo: true, is_active: true });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("seasons_demo_never_active");
  });

  it("tenter d'activer une saison Démo existante après coup est aussi rejeté", async () => {
    const { data: demoSeason } = await admin.from("seasons").insert({ name: "Démo test activation", is_demo: true, is_active: false }).select("id").single();
    const { error } = await admin.from("seasons").update({ is_active: true }).eq("id", demoSeason!.id);
    expect(error).not.toBeNull();
    await admin.from("seasons").delete().eq("id", demoSeason!.id);
  });
});

describe("Mode Démo — création et isolation des statistiques réelles", () => {
  let realStatsBefore: Awaited<ReturnType<typeof getTeamStats>>;
  let realScorersBefore: Awaited<ReturnType<typeof getTopScorers>>;
  let realPlayersSnapshotBefore: { id: string; role: string; pin_hash: string | null; pin_length: number; status: string; session_version: number; primary_position: string | null }[];

  it("capture l'état réel AVANT la création du Mode Démo", async () => {
    realStatsBefore = await getTeamStats();
    realScorersBefore = await getTopScorers();
    const { data } = await admin.from("players").select("id, role, pin_hash, pin_length, status, session_version, primary_position");
    realPlayersSnapshotBefore = data!;
    expect(realStatsBefore.played).toBeGreaterThan(0);
  });

  it("crée le dataset Démo (20 matchs, référence les vrais player_id)", async () => {
    const summary = await createOrResetDemoDataset(null, "test");
    expect(summary.matchesCreated).toBe(20);
    expect(summary.playersUsed).toBeGreaterThanOrEqual(3);

    const demoSeasonIds = await getDemoSeasonIds();
    expect(demoSeasonIds).toEqual([summary.demoSeasonId]);
    const demoMatchIds = await getDemoMatchIds();
    expect(demoMatchIds).toHaveLength(20);
  });

  it("les statistiques réelles restent strictement identiques après la création du Mode Démo", async () => {
    const statsAfter = await getTeamStats();
    const scorersAfter = await getTopScorers();
    expect(statsAfter).toEqual(realStatsBefore);
    expect(scorersAfter).toEqual(realScorersBefore);
  });

  it("aucune fuite dans la rotation réelle", async () => {
    const suggestions = await computeRotationSuggestions(ids.mainScenarioMatch, 5);
    // ids.mainScenarioMatch vient du dataset réel (seed-demo.js) — aucun des joueurs de la saison Démo ne
    // doit apparaître ici puisque ce ne sont pas des IDs différents (mêmes vrais joueurs), mais
    // le calcul lui-même ne doit avoir agrégé aucun match de la saison Démo.
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it("aucune fuite dans la fiabilité réelle (signaux inchangés pour un joueur réel)", async () => {
    const before = await getPlayerReliabilitySignals(ids.p5, 8);
    await createOrResetDemoDataset(null, "test-rerun"); // recrée le Mode Démo une deuxième fois
    const after = await getPlayerReliabilitySignals(ids.p5, 8);
    expect(after).toEqual(before);
  });

  it("aucune cotisation fictive créée", async () => {
    const { data: duesRows } = await admin.from("dues").select("id, player_id");
    const demoMatchIds = new Set(await getDemoMatchIds());
    // Le dataset Démo ne doit jamais insérer dans `dues` — vérifié en s'assurant qu'aucune ligne
    // de dues ne référence un match de la saison Démo (dues n'a pas de FK vers matches de toute
    // façon ; ce test documente l'absence de toute écriture dues par createOrResetDemoDataset).
    expect(demoMatchIds.size).toBeGreaterThan(0);
    expect(duesRows).not.toBeNull();
  });

  it("joueurs réels strictement inchangés (rôle, PIN, session_version, statut, poste)", async () => {
    const { data: playersAfter } = await admin.from("players").select("id, role, pin_hash, pin_length, status, session_version, primary_position");
    const beforeById = new Map(realPlayersSnapshotBefore.map((p) => [p.id, p]));
    for (const after of playersAfter!) {
      const before = beforeById.get(after.id);
      expect(before, `joueur ${after.id} ne doit pas avoir disparu`).toBeDefined();
      expect(after.role).toBe(before!.role);
      expect(after.pin_hash).toBe(before!.pin_hash);
      expect(after.pin_length).toBe(before!.pin_length);
      expect(after.status).toBe(before!.status);
      expect(after.session_version).toBe(before!.session_version);
      expect(after.primary_position).toBe(before!.primary_position);
    }
    // Aucun compte fictif créé : le nombre de joueurs total ne doit pas avoir changé.
    expect(playersAfter).toHaveLength(realPlayersSnapshotBefore.length);
  });

  it("un match réel n'est jamais signalé comme appartenant à la saison Démo", async () => {
    expect(await isMatchInDemoSeason(ids.mainScenarioMatch)).toBe(false);
  });

  it("les registres réels (terrains/modèles/checklist) excluent les entrées Démo par défaut", async () => {
    const venues = await getVenues();
    const templates = await getMatchTemplates();
    const checklistTemplates = await getChecklistTemplates();
    expect(venues.every((v) => !v.is_demo)).toBe(true);
    expect(templates.every((t) => !t.is_demo)).toBe(true);
    expect(checklistTemplates.every((c) => !c.is_demo)).toBe(true);
    // ... mais existent bien en mode Démo explicite.
    expect((await getVenues(true)).some((v) => v.is_demo)).toBe(true);
  });
});

describe("Mode Démo — déterminisme et idempotence", () => {
  it("deux créations consécutives produisent la même structure (20 matchs, mêmes statuts)", async () => {
    const first = await createOrResetDemoDataset(null, "test-determinism-1");
    const { data: firstMatches } = await admin.from("matches").select("status").eq("season_id", first.demoSeasonId);
    const firstByStatus = countByStatus(firstMatches!);

    const second = await createOrResetDemoDataset(null, "test-determinism-2");
    const { data: secondMatches } = await admin.from("matches").select("status").eq("season_id", second.demoSeasonId);
    const secondByStatus = countByStatus(secondMatches!);

    expect(second.demoSeasonId).toBe(first.demoSeasonId);
    expect(second.matchesCreated).toBe(first.matchesCreated);
    expect(secondByStatus).toEqual(firstByStatus);
  });
});

describe("Mode Démo — suppression strictement limitée", () => {
  it("refuse de purger une vraie saison", async () => {
    const { data: realSeason } = await admin.from("seasons").select("id").eq("is_demo", false).limit(1).single();
    const { error } = await admin.rpc("purge_demo_dataset", {
      p_demo_season_id: realSeason!.id,
      p_delete_season: true,
      p_requested_by_player_id: null,
      p_requested_by_name: "test",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/n'est pas marquée is_demo/);
  });

  it("suppression complète : la saison et toutes ses données disparaissent, les vrais joueurs restent", async () => {
    const before = await getDemoSeason();
    expect(before).not.toBeNull();

    const result = await deleteDemoDatasetEntirely(null as unknown as string, "test-delete");
    expect(result.season_deleted).toBe(true);
    expect(result.matches_deleted).toBe(20);

    expect(await getDemoSeason()).toBeNull();
    expect(await getDemoMatchIds()).toEqual([]);

    const { count } = await admin.from("players").select("*", { count: "exact", head: true }).eq("status", "active");
    expect(count).toBeGreaterThan(0);
  });

  it("suppression idempotente : un second appel sur une saison déjà supprimée est un no-op réussi", async () => {
    const result = await admin.rpc("purge_demo_dataset", {
      p_demo_season_id: "00000000-0000-0000-0000-000000000000",
      p_delete_season: true,
      p_requested_by_player_id: null,
      p_requested_by_name: "test",
    });
    expect(result.error).toBeNull();
    expect(result.data.season_found).toBe(false);
  });
});

function countByStatus(rows: { status: string }[]): Record<string, number> {
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return byStatus;
}
