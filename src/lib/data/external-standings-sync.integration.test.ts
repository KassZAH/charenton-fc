import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 11.5, §17 — tests d'intégration de la RPC transactionnelle
 * sync_external_standings_transactional sur le projet isolé exclusivement.
 * Règle centrale vérifiée à plusieurs reprises : le cache (external_standings)
 * n'est remplacé que sur un statut success réel — jamais vidé ni modifié sur
 * empty/unavailable/invalid_payload/disabled.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

function standingsPayload() {
  return [
    {
      external_team_id: "ext-1", team_name: "AS Fictif Paris", normalized_team_name: "as fictif paris",
      position: 1, played: 3, wins: 3, draws: 0, losses: 0, goals_for: 9, goals_against: 1, goal_difference: 8, points: 9,
    },
    {
      external_team_id: "ext-2", team_name: "FC Fictif Nord", normalized_team_name: "fc fictif nord",
      position: 2, played: 3, wins: 1, draws: 1, losses: 1, goals_for: 4, goals_against: 4, goal_difference: 0, points: 4,
    },
  ];
}

describe("sync_external_standings_transactional — validation", () => {
  it("refuse un statut inconnu", async () => {
    const { error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition, p_status: "bogus", p_standings: null,
      p_error_message: null, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error?.message).toMatch(/invalide/i);
  });

  it("refuse un statut success sans tableau de classement", async () => {
    const { error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition, p_status: "success", p_standings: null,
      p_error_message: null, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error?.message).toMatch(/success/i);
  });

  it("refuse une compétition externe inexistante", async () => {
    const { error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ZERO_UUID, p_status: "empty", p_standings: null,
      p_error_message: null, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error?.message).toMatch(/introuvable/i);
  });
});

describe("sync_external_standings_transactional — remplacement uniquement sur success", () => {
  it("success : insère le classement et met à jour le statut de la compétition", async () => {
    const { data, error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition, p_status: "success", p_standings: standingsPayload(),
      p_error_message: null, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();
    expect(data![0].result_rows_count).toBe(2);

    const { count } = await admin.from("external_standings").select("*", { count: "exact", head: true }).eq("external_competition_id", ids.flaCompetition);
    expect(count).toBe(2);

    const { data: competition } = await admin.from("external_competitions").select("last_sync_status, last_error_message").eq("id", ids.flaCompetition).single();
    expect(competition!.last_sync_status).toBe("success");
    expect(competition!.last_error_message).toBeNull();
  });

  it("empty après un success : conserve le cache précédent tel quel", async () => {
    const { error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition, p_status: "empty", p_standings: null,
      p_error_message: null, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();

    const { count } = await admin.from("external_standings").select("*", { count: "exact", head: true }).eq("external_competition_id", ids.flaCompetition);
    expect(count, "empty ne doit jamais vider le cache").toBe(2);

    const { data: competition } = await admin.from("external_competitions").select("last_sync_status").eq("id", ids.flaCompetition).single();
    expect(competition!.last_sync_status).toBe("empty");
  });

  it("unavailable : conserve le cache et enregistre le message d'erreur technique", async () => {
    const { error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition, p_status: "unavailable", p_standings: null,
      p_error_message: "Réponse HTTP 503", p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();

    const { count } = await admin.from("external_standings").select("*", { count: "exact", head: true }).eq("external_competition_id", ids.flaCompetition);
    expect(count, "unavailable ne doit jamais vider le cache").toBe(2);

    const { data: competition } = await admin.from("external_competitions").select("last_sync_status, last_error_message").eq("id", ids.flaCompetition).single();
    expect(competition!.last_sync_status).toBe("unavailable");
    expect(competition!.last_error_message).toBe("Réponse HTTP 503");
  });

  it("invalid_payload : conserve le cache et enregistre le message d'erreur technique", async () => {
    const { error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition, p_status: "invalid_payload", p_standings: null,
      p_error_message: "Structure HTML inattendue", p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();

    const { count } = await admin.from("external_standings").select("*", { count: "exact", head: true }).eq("external_competition_id", ids.flaCompetition);
    expect(count, "invalid_payload ne doit jamais vider le cache").toBe(2);
  });

  it("un nouveau success remplace intégralement l'ancien classement (jamais de fusion)", async () => {
    const { data, error } = await admin.rpc("sync_external_standings_transactional", {
      p_external_competition_id: ids.flaCompetition,
      p_status: "success",
      p_standings: [standingsPayload()[0]],
      p_error_message: null, p_changed_by_player_id: ids.owner, p_changed_by_name: "Test",
    });
    expect(error).toBeNull();
    expect(data![0].result_rows_count).toBe(1);

    const { count } = await admin.from("external_standings").select("*", { count: "exact", head: true }).eq("external_competition_id", ids.flaCompetition);
    expect(count).toBe(1);
  });

  it("audit_log ne contient jamais le contenu brut de la réponse externe, uniquement statut et nombre de lignes", async () => {
    const { data: auditRows } = await admin
      .from("audit_log")
      .select("*")
      .eq("table_name", "external_competitions")
      .eq("record_id", ids.flaCompetition)
      .order("created_at", { ascending: false })
      .limit(1);
    const audit = auditRows![0];
    expect(Object.keys(audit.new_data as object).sort()).toEqual(["rows_count", "status"]);
  });
});
