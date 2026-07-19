"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

function fieldsFromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    maps_url: String(formData.get("maps_url") ?? "").trim() || null,
    parking_info: String(formData.get("parking_info") ?? "").trim() || null,
    changing_rooms_info: String(formData.get("changing_rooms_info") ?? "").trim() || null,
    access_code: String(formData.get("access_code") ?? "").trim() || null,
    surface_type: String(formData.get("surface_type") ?? "").trim() || null,
    lighting: formData.get("lighting") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createVenue(formData: FormData) {
  await requireFreshCoach();
  const fields = fieldsFromFormData(formData);
  if (!fields.name) throw new Error("Le nom du terrain est obligatoire.");

  const { error } = await untypedDb.from("venues").insert(fields);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/terrains");
}

export async function updateVenue(venueId: string, formData: FormData) {
  await requireFreshCoach();
  const fields = fieldsFromFormData(formData);
  if (!fields.name) throw new Error("Le nom du terrain est obligatoire.");

  const { error } = await untypedDb
    .from("venues")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", venueId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/terrains");
}

export async function deleteVenue(venueId: string) {
  await requireFreshCoach();
  // Les matchs/modèles pointant vers ce terrain repassent à venue_id=null (on delete set null,
  // voir la migration) — jamais supprimés, jamais un match orphelin.
  const { error } = await untypedDb.from("venues").delete().eq("id", venueId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/terrains");
}

/**
 * Fusion de doublons (§7.1, roadmap V2) : réaffecte matches/match_templates du terrain
 * fusionné vers le terrain conservé, puis supprime le doublon. Pas de vraie transaction (deux
 * updates + une suppression) — risque jugé négligeable, mêmes tables déjà toutes protégées par
 * on delete set null, jamais de perte de données réelles si une étape échoue en cours de route.
 */
export async function mergeVenues(keepVenueId: string, mergeVenueId: string) {
  await requireFreshCoach();
  if (keepVenueId === mergeVenueId) throw new Error("Choisis deux terrains différents.");

  const { error: matchesError } = await untypedDb.from("matches").update({ venue_id: keepVenueId }).eq("venue_id", mergeVenueId);
  if (matchesError) throw new Error(matchesError.message);

  const { error: templatesError } = await untypedDb
    .from("match_templates")
    .update({ venue_id: keepVenueId })
    .eq("venue_id", mergeVenueId);
  if (templatesError) throw new Error(templatesError.message);

  const { error: deleteError } = await untypedDb.from("venues").delete().eq("id", mergeVenueId);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/admin/terrains");
}
