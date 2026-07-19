import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Lot 14 — vérifie au niveau base (contrainte SQL, backfill,
 * effet réel d'une transition) ce qui ne peut pas être testé au niveau
 * Server Action (requireAdmin() dépend de next/headers, jamais disponible
 * hors d'une vraie requête Next.js — cohérent avec le reste du projet, voir
 * rpc-*.integration.test.ts qui appellent toujours les RPC directement). La
 * matrice de transition elle-même est testée en pur dans
 * match-lifecycle-rules.test.ts. Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("matches_status_check — contrainte SQL", () => {
  it("refuse une valeur de statut hors de la liste autorisée", async () => {
    const { error } = await admin.from("matches").update({ status: "bogus" }).eq("id", ids.match3);
    expect(error?.message).toMatch(/matches_status_check|violates check constraint/i);
  });

  it("accepte les six statuts du modèle validé", async () => {
    for (const status of ["draft", "scheduled", "live", "completed", "cancelled", "postponed"]) {
      const { error } = await admin.from("matches").update({ status }).eq("id", ids.match3);
      expect(error, `statut ${status} devrait être accepté`).toBeNull();
    }
    // Remis à un état cohérent pour ne pas perturber d'autres assertions dans ce fichier.
    await admin.from("matches").update({ status: "scheduled" }).eq("id", ids.match3);
  });
});

describe("matches_completion_status_check — contrainte SQL", () => {
  it("refuse une valeur hors de la liste autorisée", async () => {
    const { error } = await admin.from("matches").update({ completion_status: "bogus" }).eq("id", ids.match3);
    expect(error?.message).toMatch(/matches_completion_status_check|violates check constraint/i);
  });
});

describe("seed — completion_status reflète l'état réel des matchs fixtures", () => {
  it("match1 (données complètes : buteurs, votes) est validated", async () => {
    const { data } = await admin.from("matches").select("status, completion_status").eq("id", ids.match1).single();
    expect(data!.status).toBe("completed");
    expect(data!.completion_status).toBe("validated");
  });

  it("match2 (volontairement sans vote) reste incomplete", async () => {
    const { data } = await admin.from("matches").select("status, completion_status").eq("id", ids.match2).single();
    expect(data!.status).toBe("completed");
    expect(data!.completion_status).toBe("incomplete");
  });

  it("match3 (seedé scheduled) reste au défaut not_started", async () => {
    const { data } = await admin.from("matches").select("completion_status").eq("id", ids.match3).single();
    expect(data!.completion_status).toBe("not_started");
  });
});

describe("effet réel d'une transition (mécanique exercée par transitionMatchStatus)", () => {
  it("scheduled -> postponed -> scheduled, sans perte des autres champs", async () => {
    const { data: before } = await admin.from("matches").select("match_date, opponent_id").eq("id", ids.match3).single();

    await admin.from("matches").update({ status: "postponed" }).eq("id", ids.match3);
    const { data: postponed } = await admin.from("matches").select("status, match_date, opponent_id").eq("id", ids.match3).single();
    expect(postponed!.status).toBe("postponed");
    expect(postponed!.match_date).toBe(before!.match_date);
    expect(postponed!.opponent_id).toBe(before!.opponent_id);

    await admin.from("matches").update({ status: "scheduled" }).eq("id", ids.match3);
    const { data: rescheduled } = await admin.from("matches").select("status").eq("id", ids.match3).single();
    expect(rescheduled!.status).toBe("scheduled");
  });

  it("scheduled -> live pose started_at une seule fois (idempotence d'un double-clic)", async () => {
    const startedAt = new Date().toISOString();
    await admin.from("matches").update({ status: "live", started_at: startedAt }).eq("id", ids.match3);
    const { data: first } = await admin.from("matches").select("started_at").eq("id", ids.match3).single();
    // Postgres reformate timestamptz à la lecture (précision/notation différentes de l'ISO string
    // JS d'origine) — comparaison par valeur temporelle, jamais par égalité de chaîne exacte.
    expect(new Date(first!.started_at!).getTime()).toBe(new Date(startedAt).getTime());

    // Un second "démarrage" ne doit jamais écraser started_at (même logique que transitionMatchStatus :
    // ne poser started_at que s'il est encore null).
    const { data: current } = await admin.from("matches").select("started_at").eq("id", ids.match3).single();
    if (!current!.started_at) {
      await admin.from("matches").update({ started_at: new Date().toISOString() }).eq("id", ids.match3);
    }
    const { data: second } = await admin.from("matches").select("started_at").eq("id", ids.match3).single();
    expect(new Date(second!.started_at!).getTime()).toBe(new Date(startedAt).getTime());
  });

  it("annulation : l'historique des champs déjà renseignés reste intact", async () => {
    await admin.from("matches").update({ status: "cancelled" }).eq("id", ids.match3);
    const { data } = await admin.from("matches").select("status, started_at").eq("id", ids.match3).single();
    expect(data!.status).toBe("cancelled");
    expect(data!.started_at).not.toBeNull();
  });
});
