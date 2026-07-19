"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActiveRestriction } from "./player-restrictions";
import type { RestrictionType, RestrictionVisibility } from "@/types/models";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

const VALID_TYPES: RestrictionType[] = [
  "no_goalkeeper",
  "no_defence",
  "no_attack",
  "no_intense_running",
  "limited_play_time",
  "progressive_return",
  "custom",
];

function parseRestrictionTypes(formData: FormData): RestrictionType[] {
  const raw = formData.getAll("restriction_types").map(String);
  const types = raw.filter((t): t is RestrictionType => (VALID_TYPES as string[]).includes(t));
  if (types.length === 0) throw new Error("Choisis au moins un type de restriction.");
  return types;
}

/**
 * Réservé aux coachs (jamais l'auto-déclaration comme les blessures — une restriction encadre
 * une reprise, décision d'encadrement plutôt que ressenti du joueur). L'index unique partiel
 * player_restrictions_one_active_per_player protège nativement contre une double création
 * concurrente, la pré-vérification ci-dessous ne sert qu'à un message d'erreur clair.
 */
export async function createPlayerRestriction(playerId: string, formData: FormData) {
  const coach = await requireFreshCoach();

  const existing = await getActiveRestriction(playerId);
  if (existing) {
    throw new Error("Une restriction est déjà active pour ce joueur — clôture-la avant d'en créer une nouvelle.");
  }

  const restrictionTypes = parseRestrictionTypes(formData);
  const startsAt = String(formData.get("starts_at") ?? "") || new Date().toISOString().slice(0, 10);
  const endsAt = String(formData.get("ends_at") ?? "") || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const visibility = (String(formData.get("visibility") ?? "coaches") || "coaches") as RestrictionVisibility;

  const { error } = await untypedDb.from("player_restrictions").insert({
    player_id: playerId,
    starts_at: startsAt,
    ends_at: endsAt,
    restriction_types: restrictionTypes,
    comment,
    visibility,
    status: "active",
    created_by_player_id: coach.playerId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/matches");
}

export async function endPlayerRestriction(restrictionId: string) {
  await requireFreshCoach();

  const { error } = await untypedDb
    .from("player_restrictions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", restrictionId)
    .eq("status", "active");
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/matches");
}
