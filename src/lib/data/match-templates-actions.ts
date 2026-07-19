"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMatchTemplateById, computeMeetingTimeFromOffset } from "./match-templates";
import { getVenueById } from "./venues";
import type { MatchTemplateHomeOrAway } from "@/types/models";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

function fieldsFromFormData(formData: FormData) {
  const offsetRaw = String(formData.get("meeting_offset_minutes") ?? "").trim();
  const maxPlayersRaw = String(formData.get("max_players") ?? "").trim();
  const equipmentRaw = String(formData.get("default_equipment_items") ?? "").trim();

  return {
    name: String(formData.get("name") ?? "").trim(),
    venue_id: String(formData.get("venue_id") ?? "") || null,
    kickoff_time: String(formData.get("kickoff_time") ?? "") || null,
    meeting_offset_minutes: offsetRaw ? Number(offsetRaw) : null,
    match_type: String(formData.get("match_type") ?? "") || null,
    home_or_away: (String(formData.get("home_or_away") ?? "") || null) as MatchTemplateHomeOrAway | null,
    max_players: maxPlayersRaw ? Number(maxPlayersRaw) : null,
    default_equipment_items: equipmentRaw
      ? equipmentRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createMatchTemplate(formData: FormData) {
  await requireFreshCoach();
  const fields = fieldsFromFormData(formData);
  if (!fields.name) throw new Error("Le nom du modèle est obligatoire.");

  const { error } = await untypedDb.from("match_templates").insert(fields);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/modeles");
}

export async function updateMatchTemplate(templateId: string, formData: FormData) {
  await requireFreshCoach();
  const fields = fieldsFromFormData(formData);
  if (!fields.name) throw new Error("Le nom du modèle est obligatoire.");

  const { error } = await untypedDb
    .from("match_templates")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", templateId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/modeles");
}

export async function deleteMatchTemplate(templateId: string) {
  await requireFreshCoach();
  const { error } = await untypedDb.from("match_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/modeles");
}

/**
 * Génère un nouveau match à partir d'un modèle (§7.6, roadmap V2) : structure uniquement
 * (lieu, horaires, type) — ne recopie jamais présence/covoiturage/blessures/paiements, qui
 * n'existent tout simplement pas encore pour un match qui vient d'être créé.
 */
export async function generateMatchFromTemplate(templateId: string, formData: FormData) {
  await requireFreshCoach();

  const matchDate = String(formData.get("match_date") ?? "");
  if (!matchDate) throw new Error("La date du nouveau match est obligatoire.");

  const template = await getMatchTemplateById(templateId);
  if (!template) throw new Error("Modèle introuvable.");

  const venue = template.venue_id ? await getVenueById(template.venue_id) : null;
  const meetingTime = computeMeetingTimeFromOffset(template.kickoff_time, template.meeting_offset_minutes);

  const { data: activeSeason } = await supabaseAdmin.from("seasons").select("id").eq("is_active", true).maybeSingle();

  const { data: match, error } = await untypedDb
    .from("matches")
    .insert({
      match_date: matchDate,
      kickoff_time: template.kickoff_time,
      meeting_time: meetingTime,
      location: venue?.name ?? null,
      address: venue?.address ?? null,
      maps_url: venue?.maps_url ?? null,
      venue_id: template.venue_id,
      home_or_away: template.home_or_away ?? "home",
      match_type: template.match_type,
      season_id: activeSeason?.id ?? null,
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${match.id}`);
}
