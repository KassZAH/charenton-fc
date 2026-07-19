import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 9 — tests d'intégration serveur des RPC transactionnelles
 * des Lots 7 et 8, sur le projet isolé exclusivement. Dataset remis à zéro
 * une seule fois en tête de fichier (fileParallelism: false dans
 * vitest.integration.config.ts — ce fichier ne s'exécute jamais en même
 * temps qu'un autre sur le même projet).
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("close_season_and_start_new — Lot 7", () => {
  it("refuse un propriétaire non conforme sans écrire quoi que ce soit (permissions Propriétaire)", async () => {
    const { count: before } = await admin.from("seasons").select("*", { count: "exact", head: true });
    const { error } = await admin.rpc("close_season_and_start_new", {
      p_old_season_id: ids.season, p_new_season_name: "Rejet", p_new_season_start_date: "2027-01-01",
      p_new_season_end_date: null, p_player_ids_to_archive: [], p_new_season_due_amount: null,
      p_owner_player_id: ids.coach2, p_application_commit: null,
    });
    expect(error?.message).toMatch(/propriétaire/i);
    const { count: after } = await admin.from("seasons").select("*", { count: "exact", head: true });
    expect(after).toBe(before);
  });

  it("refuse un joueur non-propriétaire (permissions Joueur)", async () => {
    const { error } = await admin.rpc("close_season_and_start_new", {
      p_old_season_id: ids.season, p_new_season_name: "Rejet", p_new_season_start_date: "2027-01-01",
      p_new_season_end_date: null, p_player_ids_to_archive: [], p_new_season_due_amount: null,
      p_owner_player_id: ids.p1, p_application_commit: null,
    });
    expect(error?.message).toMatch(/propriétaire/i);
  });

  it("échec intermédiaire (joueur à archiver inexistant) : rollback complet, aucun backup créé", async () => {
    const { count: backupsBefore } = await admin.from("backups").select("*", { count: "exact", head: true });
    const { error } = await admin.rpc("close_season_and_start_new", {
      p_old_season_id: ids.season, p_new_season_name: "Rejet mi-parcours", p_new_season_start_date: "2027-01-01",
      p_new_season_end_date: null, p_player_ids_to_archive: [ids.p2, ZERO_UUID], p_new_season_due_amount: null,
      p_owner_player_id: ids.owner, p_application_commit: null,
    });
    expect(error?.message).toMatch(/introuvable/i);
    const { count: backupsAfter } = await admin.from("backups").select("*", { count: "exact", head: true });
    expect(backupsAfter, "aucun backup ne doit survivre à un rollback").toBe(backupsBefore);
    const { data: p2 } = await admin.from("players").select("status").eq("id", ids.p2).single();
    expect(p2!.status, "le joueur déjà traité dans la boucle avant l'échec doit aussi être annulé").toBe("active");
  });

  it("clôture réussie : verrouillage de saison, session_version, une seule saison active, audit minimal", async () => {
    const { data, error } = await admin.rpc("close_season_and_start_new", {
      p_old_season_id: ids.season, p_new_season_name: "Saison Test Intégration", p_new_season_start_date: "2027-01-01",
      p_new_season_end_date: null, p_player_ids_to_archive: [ids.p2], p_new_season_due_amount: 30,
      p_owner_player_id: ids.owner, p_application_commit: "integration-test",
    });
    expect(error).toBeNull();
    const row = data![0];

    const { data: oldSeason } = await admin.from("seasons").select("is_active, is_locked").eq("id", ids.season).single();
    expect(oldSeason!.is_active).toBe(false);
    expect(oldSeason!.is_locked).toBe(true);

    const { count: activeCount } = await admin.from("seasons").select("*", { count: "exact", head: true }).eq("is_active", true);
    expect(activeCount).toBe(1);

    const { data: p2After } = await admin.from("players").select("status, session_version").eq("id", ids.p2).single();
    expect(p2After!.status).toBe("archived");
    expect(p2After!.session_version, "session_version doit être incrémenté pour révoquer les sessions du joueur archivé").toBe(2);

    const { data: audit } = await admin.from("audit_log").select("*").eq("record_id", row.new_season_id).single();
    expect(audit!.table_name).toBe("seasons");
    expect(JSON.stringify(audit!.new_data)).not.toMatch(/pin_hash/);
  });
});

describe("Verrouillage de saison — assertMatchSeasonUnlocked (préexistant, revérifié en conditions réelles)", () => {
  it("la saison clôturée par le test précédent est bien verrouillée", async () => {
    const { data: season } = await admin.from("seasons").select("is_locked").eq("id", ids.season).single();
    expect(season!.is_locked).toBe(true);
  });
});

describe("upsert_injury_and_sync_availability — Lot 8", () => {
  it("double soumission : la deuxième déclaration pour le même joueur est refusée (idempotence)", async () => {
    const first = await admin.rpc("upsert_injury_and_sync_availability", {
      p_injury_id: null, p_player_id: ids.p3, p_new_status: "active", p_started_at: "2026-09-10",
      p_estimated_return_date: null, p_actual_return_date: null, p_comment: null, p_comment_visibility: null,
      p_changed_by_player_id: ids.p3, p_changed_by_name: "Test",
    });
    expect(first.error).toBeNull();

    const second = await admin.rpc("upsert_injury_and_sync_availability", {
      p_injury_id: null, p_player_id: ids.p3, p_new_status: "active", p_started_at: "2026-09-11",
      p_estimated_return_date: null, p_actual_return_date: null, p_comment: null, p_comment_visibility: null,
      p_changed_by_player_id: ids.p3, p_changed_by_name: "Test",
    });
    expect(second.error?.message).toMatch(/injuries_one_active_per_player|duplicate/i);
  });

  it("appels concurrents de clôture de la même blessure : aucun ne casse, un seul état final cohérent", async () => {
    const { data: injury } = await admin.from("injuries").select("id").eq("player_id", ids.p3).eq("status", "active").single();
    const [a, b] = await Promise.allSettled([
      admin.rpc("upsert_injury_and_sync_availability", {
        p_injury_id: injury!.id, p_player_id: ids.p3, p_new_status: "closed", p_started_at: null,
        p_estimated_return_date: null, p_actual_return_date: "2026-09-15", p_comment: null, p_comment_visibility: null,
        p_changed_by_player_id: ids.p3, p_changed_by_name: "Test",
      }),
      admin.rpc("upsert_injury_and_sync_availability", {
        p_injury_id: injury!.id, p_player_id: ids.p3, p_new_status: "closed", p_started_at: null,
        p_estimated_return_date: null, p_actual_return_date: "2026-09-15", p_comment: null, p_comment_visibility: null,
        p_changed_by_player_id: ids.p3, p_changed_by_name: "Test",
      }),
    ]);
    const errors = [a, b].map((r) => (r.status === "fulfilled" ? r.value.error : r.reason));
    expect(errors.every((e) => !e)).toBe(true);
    const { data: finalInjury } = await admin.from("injuries").select("status").eq("id", injury!.id).single();
    expect(finalInjury!.status).toBe("closed");
  });
});

describe("restore_audit_entry_transactional — Lot 8", () => {
  it("restaure une fiche joueur sans jamais toucher pin_hash/session_version (allow-list)", async () => {
    const { data: before } = await admin.from("players").select("*").eq("id", ids.p1).single();
    await admin.from("players").update({ quote: "Modifié par le test d'intégration" }).eq("id", ids.p1);
    const { data: auditRow } = await admin
      .from("audit_log")
      .insert({
        table_name: "players", record_id: ids.p1, action: "update",
        old_data: before, new_data: { quote: "Modifié par le test d'intégration" },
        changed_by_player_id: ids.owner, changed_by_name: "Proprio",
      })
      .select("id")
      .single();

    const { error } = await admin.rpc("restore_audit_entry_transactional", { p_audit_log_id: auditRow!.id });
    expect(error).toBeNull();

    const { data: after } = await admin.from("players").select("*").eq("id", ids.p1).single();
    expect(after!.quote).toBe(before!.quote);
    expect(after!.pin_hash).toBe(before!.pin_hash);
    expect(after!.session_version).toBe(before!.session_version);

    const second = await admin.rpc("restore_audit_entry_transactional", { p_audit_log_id: auditRow!.id });
    expect(second.error?.message).toMatch(/déjà/i);
  });
});
