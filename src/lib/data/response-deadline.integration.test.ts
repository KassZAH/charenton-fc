import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchAvailabilitySummary } from "./availability";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 20) — response_deadline (matches) et
 * first_responded_at/last_changed_at/late_response (availability). Le calcul de late_response
 * lui-même (computeLateResponse) est couvert par un test unitaire pur (response-deadline.test.ts) ;
 * ce test-ci vérifie que les colonnes existent réellement en base et que getMatchAvailabilitySummary
 * les restitue correctement. La logique d'upsert (matches-actions.ts) dépend de next/headers et
 * next/cache — non testable hors contexte de requête Next, même limite que les autres actions
 * serveur de ce dépôt (voir les tests d'intégration Lots 12-18, qui testent toujours au niveau RPC/table,
 * jamais au niveau de la Server Action). Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("response_deadline / late_response — colonnes et lecture", () => {
  it("matches.response_deadline est nullable et se règle sur un match", async () => {
    const { error } = await admin
      .from("matches")
      .update({ response_deadline: "2026-08-09T18:00:00Z" })
      .eq("id", ids.match3);
    expect(error).toBeNull();

    const { data } = await admin.from("matches").select("response_deadline").eq("id", ids.match3).single();
    expect(data?.response_deadline).not.toBeNull();
  });

  it("availability.late_response=true est restitué par getMatchAvailabilitySummary", async () => {
    const { error } = await admin.from("availability").insert({
      match_id: ids.match3,
      player_id: ids.p1,
      status: "present",
      first_responded_at: "2026-08-09T19:00:00Z",
      last_changed_at: "2026-08-09T19:00:00Z",
      late_response: true,
    });
    expect(error).toBeNull();

    const summary = await getMatchAvailabilitySummary(ids.match3);
    const row = summary.find((s) => s.player.id === ids.p1);
    expect(row?.lateResponse).toBe(true);
    expect(row?.status).toBe("present");
  });

  it("un joueur sans ligne availability a lateResponse=false par défaut", async () => {
    const summary = await getMatchAvailabilitySummary(ids.match3);
    const row = summary.find((s) => s.player.id === ids.p2);
    expect(row?.lateResponse).toBe(false);
    expect(row?.status).toBeNull();
  });
});
