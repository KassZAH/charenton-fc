import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMatchCarpoolSummary } from "./carpool";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 23) — covoiturage avec affectations : places restantes après
 * affectation, déficit, retrait, jamais deux conducteurs pour un même passager (contrainte
 * unique). assignCarpoolPassenger/unassignCarpoolPassenger (Server Actions) dépendent de
 * requireFreshCoach() — ce test reproduit leur effet directement au niveau table. Projet isolé
 * exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;

  // p1 conduit (2 places), p2 et p3 cherchent une place — sur match3 (scheduled).
  await admin.from("availability").insert([
    { match_id: ids.match3, player_id: ids.p1, status: "present", can_drive: true, available_seats: 2, departure_point: "Métro Charenton", departure_time: "18:30" },
    { match_id: ids.match3, player_id: ids.p2, status: "present", needs_ride: true },
    { match_id: ids.match3, player_id: ids.p3, status: "present", needs_ride: true },
  ]);
}, 30000);

describe("getMatchCarpoolSummary — affectations", () => {
  it("sans affectation : 2 places, 2 en attente, pas de déficit (2<=2)", async () => {
    const summary = await getMatchCarpoolSummary(ids.match3);
    expect(summary.drivers[0].remainingSeats).toBe(2);
    expect(summary.unassignedRiders.map((r) => r.playerId).sort()).toEqual([ids.p2, ids.p3].sort());
    expect(summary.hasDeficit).toBe(false);
  });

  it("affecte p2 à p1 : 1 place restante, p2 n'est plus en attente", async () => {
    const { error } = await admin.from("carpool_assignments").insert({
      match_id: ids.match3, driver_player_id: ids.p1, passenger_player_id: ids.p2,
    });
    expect(error).toBeNull();

    const summary = await getMatchCarpoolSummary(ids.match3);
    expect(summary.drivers[0].remainingSeats).toBe(1);
    expect(summary.drivers[0].assignedPassengers.map((p) => p.playerId)).toEqual([ids.p2]);
    expect(summary.unassignedRiders.map((r) => r.playerId)).toEqual([ids.p3]);
    expect(summary.hasDeficit).toBe(false);
  });

  it("refuse une deuxième affectation pour le même passager sur le même match (contrainte unique)", async () => {
    const { error } = await admin.from("carpool_assignments").insert({
      match_id: ids.match3, driver_player_id: ids.p1, passenger_player_id: ids.p2,
    });
    expect(error).not.toBeNull();
  });

  it("retrait de l'affectation : la place redevient disponible", async () => {
    const { error } = await admin
      .from("carpool_assignments")
      .delete()
      .eq("match_id", ids.match3)
      .eq("passenger_player_id", ids.p2);
    expect(error).toBeNull();

    const summary = await getMatchCarpoolSummary(ids.match3);
    expect(summary.drivers[0].remainingSeats).toBe(2);
    expect(summary.unassignedRiders.map((r) => r.playerId).sort()).toEqual([ids.p2, ids.p3].sort());
  });

  it("point/heure de départ du conducteur restitués", async () => {
    const summary = await getMatchCarpoolSummary(ids.match3);
    expect(summary.drivers[0].departurePoint).toBe("Métro Charenton");
    expect(summary.drivers[0].departureTime).toContain("18:30");
  });

  it("déficit détecté quand les deux passagers sont assignés et qu'un troisième cherche une place sans siège restant", async () => {
    await admin.from("carpool_assignments").insert([
      { match_id: ids.match3, driver_player_id: ids.p1, passenger_player_id: ids.p2 },
      { match_id: ids.match3, driver_player_id: ids.p1, passenger_player_id: ids.p3 },
    ]);
    await admin.from("availability").upsert(
      { match_id: ids.match3, player_id: ids.owner, status: "present", needs_ride: true },
      { onConflict: "match_id,player_id" }
    );

    const summary = await getMatchCarpoolSummary(ids.match3);
    expect(summary.drivers[0].remainingSeats).toBe(0);
    expect(summary.unassignedRiders.map((r) => r.playerId)).toEqual([ids.owner]);
    expect(summary.hasDeficit).toBe(true);
  });

  it("RLS activée sur carpool_assignments : anon ne lit rien sans policy", async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return;
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey);
    const { data, error } = await anonClient.from("carpool_assignments").select("*").limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
