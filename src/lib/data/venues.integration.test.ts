import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getVenues, getVenueById } from "./venues";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resetAndSeed } = require("../../../scripts/isolated-env/reset-and-seed.js");

/**
 * Roadmap V3, Macro-release B (Lot 22) — venues : lecture, venue_id en transition sur matches
 * (jamais à la place de location/address/maps_url), fusion de doublons. Les Server Actions
 * (venues-actions.ts) dépendent de requireFreshCoach()/next-headers — non testables hors requête
 * Next (même limite documentée pour les autres lots) ; ce test exerce donc les mêmes effets au
 * niveau table, directement via le client admin. Projet isolé exclusivement.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let ids: Record<string, string>;

beforeAll(async () => {
  const result = await resetAndSeed();
  ids = result.ids;
}, 30000);

describe("venues — CRUD et transition venue_id", () => {
  it("crée un terrain et le retrouve", async () => {
    const { data: venue, error } = await admin
      .from("venues")
      .insert({ name: "Stade des Marronniers", address: "1 rue du Stade", lighting: true })
      .select("id")
      .single();
    expect(error).toBeNull();
    ids.venue1 = venue!.id;

    const venues = await getVenues();
    expect(venues.some((v) => v.id === ids.venue1)).toBe(true);
    expect(await getVenueById(ids.venue1)).not.toBeNull();
  });

  it("matches.venue_id se règle sans toucher location/address/maps_url existants", async () => {
    await admin.from("matches").update({ location: "Ancien nom", venue_id: ids.venue1 }).eq("id", ids.match3);
    const { data } = await admin.from("matches").select("location, venue_id").eq("id", ids.match3).single();
    expect(data?.venue_id).toBe(ids.venue1);
    expect(data?.location).toBe("Ancien nom");
  });

  it("suppression d'un terrain : les matchs repassent à venue_id=null (on delete set null), jamais supprimés", async () => {
    const { data: venue2 } = await admin.from("venues").insert({ name: "Terrain temporaire" }).select("id").single();
    await admin.from("matches").update({ venue_id: venue2!.id }).eq("id", ids.match3);

    const { error } = await admin.from("venues").delete().eq("id", venue2!.id);
    expect(error).toBeNull();

    const { data: match } = await admin.from("matches").select("id, venue_id").eq("id", ids.match3).single();
    expect(match).not.toBeNull();
    expect(match?.venue_id).toBeNull();
  });

  it("fusion de doublons : réaffecte puis supprime (comportement de mergeVenues)", async () => {
    const { data: dup } = await admin.from("venues").insert({ name: "Doublon" }).select("id").single();
    await admin.from("matches").update({ venue_id: dup!.id }).eq("id", ids.match3);

    // Reproduit mergeVenues(ids.venue1, dup.id) au niveau table (mêmes deux updates + delete).
    await admin.from("matches").update({ venue_id: ids.venue1 }).eq("venue_id", dup!.id);
    await admin.from("match_templates").update({ venue_id: ids.venue1 }).eq("venue_id", dup!.id);
    const { error: deleteError } = await admin.from("venues").delete().eq("id", dup!.id);
    expect(deleteError).toBeNull();

    const { data: match } = await admin.from("matches").select("venue_id").eq("id", ids.match3).single();
    expect(match?.venue_id).toBe(ids.venue1);
  });

  it("RLS activée : anon ne lit rien sans policy", async () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return;
    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey);
    const { data, error } = await anonClient.from("venues").select("*").limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
