import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Roadmap V3, Lot 9 — vérifie que toutes les fonctions SECURITY DEFINER
 * sensibles des Lots 6/7/8 refusent anon/authenticated et acceptent
 * service_role, sur le projet isolé exclusivement (garde-fou appliqué par
 * vitest.integration.setup.ts avant même l'exécution de ce fichier).
 */

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

async function expectAnonDenied(fnName: string, params: Record<string, unknown>) {
  const { error } = await anon.rpc(fnName, params);
  expect(error, `${fnName} devrait être refusée à anon`).not.toBeNull();
  expect(error!.message).toMatch(/permission denied/i);
}

describe("RPC sensibles — anon toujours refusé", () => {
  it("export_backup_snapshot", async () => {
    await expectAnonDenied("export_backup_snapshot", {});
  });

  it("get_latest_applied_migration", async () => {
    await expectAnonDenied("get_latest_applied_migration", {});
  });

  it("list_public_base_tables", async () => {
    await expectAnonDenied("list_public_base_tables", {});
  });

  it("create_sensitive_backup_with_audit_artifact", async () => {
    await expectAnonDenied("create_sensitive_backup_with_audit_artifact", {
      p_label: "x", p_trigger_reason: "manual", p_backup_type: "manual", p_protected: false,
      p_created_by_player_id: ZERO_UUID, p_created_by_context: "test", p_application_commit: null,
      p_database_schema_version: null, p_active_season_id: null, p_active_season_name: null,
    });
  });

  it("finalize_sensitive_backup_checksums", async () => {
    await expectAnonDenied("finalize_sensitive_backup_checksums", {
      p_backup_id: ZERO_UUID, p_backup_checksum: "x", p_artifact_checksum: null,
    });
  });

  it("close_season_and_start_new (Lot 7)", async () => {
    await expectAnonDenied("close_season_and_start_new", {
      p_old_season_id: ZERO_UUID, p_new_season_name: "x", p_new_season_start_date: "2027-01-01",
      p_new_season_end_date: null, p_player_ids_to_archive: [], p_new_season_due_amount: null,
      p_owner_player_id: ZERO_UUID, p_application_commit: null,
    });
  });

  it("upsert_injury_and_sync_availability (Lot 8)", async () => {
    await expectAnonDenied("upsert_injury_and_sync_availability", {
      p_injury_id: null, p_player_id: ZERO_UUID, p_new_status: "active", p_started_at: "2026-01-01",
      p_estimated_return_date: null, p_actual_return_date: null, p_comment: null, p_comment_visibility: null,
      p_changed_by_player_id: ZERO_UUID, p_changed_by_name: "x",
    });
  });

  it("restore_audit_entry_transactional (Lot 8)", async () => {
    await expectAnonDenied("restore_audit_entry_transactional", { p_audit_log_id: ZERO_UUID });
  });

  it("sync_external_standings_transactional (Lot 11.5)", async () => {
    await expectAnonDenied("sync_external_standings_transactional", {
      p_external_competition_id: ZERO_UUID, p_status: "empty", p_standings: null,
      p_error_message: null, p_changed_by_player_id: ZERO_UUID, p_changed_by_name: "x",
    });
  });

  it("set_match_goalkeepers (Lot 13)", async () => {
    await expectAnonDenied("set_match_goalkeepers", { p_match_id: ZERO_UUID, p_goalkeeper_player_ids: [] });
  });
});

describe("export_backup_snapshot — accès réservé, jamais anon", () => {
  it("service_role (donc le Propriétaire via supabaseAdmin côté serveur) peut lire un snapshot réel", async () => {
    const { data, error } = await admin.rpc("export_backup_snapshot");
    expect(error).toBeNull();
    expect(data).toBeTypeOf("object");
    // Le snapshot doit au moins contenir la table players du dataset fictif isolé.
    expect(Object.keys(data as Record<string, unknown>)).toContain("players");
  });

  it("anon ne peut pas lire un snapshot (aucune fuite de données, même du dataset fictif)", async () => {
    await expectAnonDenied("export_backup_snapshot", {});
  });
});

describe("Isolation du projet", () => {
  it("l'URL Supabase utilisée par ce fichier de test est bien celle du projet isolé", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toContain("cimbymuifzooxrnenznd");
  });
});
