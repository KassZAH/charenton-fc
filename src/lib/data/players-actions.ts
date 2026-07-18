"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFreshCoach, requireFreshUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { getOwnerPlayerId } from "./team-settings";
import type { TablesUpdate } from "@/types/database";
import { NEW_PIN_LENGTH } from "@/types/models";

/**
 * Le rôle n'est plus assignable ici — "player" est la seule valeur possible
 * à la création. La promotion en coach est une action séparée réservée au
 * propriétaire (ownership-actions.ts, roadmap V3 Lot 5).
 */
export async function createPlayer(formData: FormData) {
  await requireFreshCoach();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const shirtNumberRaw = String(formData.get("shirt_number") ?? "").trim();
  const primaryPosition = String(formData.get("primary_position") ?? "").trim() || null;
  const pin = String(formData.get("pin") ?? "").trim();

  if (!firstName) {
    throw new Error("Le prénom est obligatoire.");
  }

  // Tout nouveau PIN exige 6 chiffres, quel que soit le rôle (roadmap V3, Lot 5).
  if (pin.length !== NEW_PIN_LENGTH || !/^\d+$/.test(pin)) {
    throw new Error(`Le PIN doit contenir ${NEW_PIN_LENGTH} chiffres.`);
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const { error } = await supabaseAdmin.from("players").insert({
    first_name: firstName,
    last_name: lastName,
    nickname,
    role: "player",
    shirt_number: shirtNumberRaw ? Number(shirtNumberRaw) : null,
    primary_position: primaryPosition,
    pin_hash: pinHash,
    pin_length: NEW_PIN_LENGTH,
    status: "active",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  redirect("/team");
}

export async function setPlayerStatus(playerId: string, status: "active" | "archived") {
  await requireFreshCoach();

  if (status === "archived") {
    const ownerPlayerId = await getOwnerPlayerId();
    if (playerId === ownerPlayerId) {
      throw new Error("Le propriétaire du club ne peut pas être archivé.");
    }
  }

  const { data: current } = await supabaseAdmin.from("players").select("session_version").eq("id", playerId).maybeSingle();

  const { error } = await supabaseAdmin
    .from("players")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      // Révoque immédiatement toute session existante (ex. un joueur archivé ne doit plus rien pouvoir faire).
      session_version: (current?.session_version ?? 1) + 1,
    })
    .eq("id", playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath(`/team/${playerId}`);
}

/**
 * Édition générique par un coach — ne modifie jamais le rôle. La promotion
 * en coach et la rétrogradation en joueur sont des actions séparées,
 * réservées au propriétaire (ownership-actions.ts, roadmap V3 Lot 5).
 */
export async function updatePlayer(playerId: string, formData: FormData) {
  const user = await requireFreshCoach();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const shirtNumberRaw = String(formData.get("shirt_number") ?? "").trim();
  const primaryPosition = String(formData.get("primary_position") ?? "").trim() || null;
  const strongFoot = String(formData.get("strong_foot") ?? "").trim() || null;
  const quote = String(formData.get("quote") ?? "").trim() || null;
  const newPin = String(formData.get("new_pin") ?? "").trim();

  if (!firstName) {
    throw new Error("Le prénom est obligatoire.");
  }

  const { data: before } = await supabaseAdmin.from("players").select("*").eq("id", playerId).maybeSingle();

  const update: TablesUpdate<"players"> = {
    first_name: firstName,
    last_name: lastName,
    nickname,
    shirt_number: shirtNumberRaw ? Number(shirtNumberRaw) : null,
    primary_position: primaryPosition,
    strong_foot: strongFoot,
    quote,
    // Révoque immédiatement toute session existante — un changement de PIN
    // ne doit pas attendre l'expiration du cookie pour prendre effet.
    session_version: (before?.session_version ?? 1) + 1,
  };

  if (newPin) {
    // Tout changement volontaire de PIN exige 6 chiffres, quel que soit le rôle (roadmap V3, Lot 5).
    if (newPin.length !== NEW_PIN_LENGTH || !/^\d+$/.test(newPin)) {
      throw new Error(`Le nouveau PIN doit contenir ${NEW_PIN_LENGTH} chiffres.`);
    }
    update.pin_hash = await bcrypt.hash(newPin, 10);
    update.pin_length = NEW_PIN_LENGTH;
  }

  const { error } = await supabaseAdmin.from("players").update(update).eq("id", playerId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "players",
    recordId: playerId,
    action: "update",
    oldData: before,
    newData: { ...before, ...update },
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath("/team");
  revalidatePath(`/team/${playerId}`);
  redirect(`/team/${playerId}`);
}

/**
 * Auto-édition par le joueur lui-même : uniquement ses infos de profil.
 * Le numéro de maillot, le rôle et le PIN restent réservés à l'admin.
 */
export async function updateOwnProfile(formData: FormData) {
  const user = await requireFreshUser();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const primaryPosition = String(formData.get("primary_position") ?? "").trim() || null;
  const strongFoot = String(formData.get("strong_foot") ?? "").trim() || null;
  const quote = String(formData.get("quote") ?? "").trim() || null;
  const birthday = String(formData.get("birthday") ?? "").trim() || null;
  const photoUrl = String(formData.get("photo_url") ?? "").trim() || null;

  if (!firstName) {
    throw new Error("Le prénom est obligatoire.");
  }

  const { error } = await supabaseAdmin
    .from("players")
    .update({
      first_name: firstName,
      last_name: lastName,
      nickname,
      primary_position: primaryPosition,
      strong_foot: strongFoot,
      quote,
      birthday,
      photo_url: photoUrl,
    })
    .eq("id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
  revalidatePath("/team");
  redirect("/profile");
}

/** Invalide immédiatement l'ancien lien (calendrier ou profil public) en cas de partage accidentel. */
export async function regenerateCalendarToken() {
  const user = await requireFreshUser();
  const { error } = await supabaseAdmin
    .from("players")
    .update({ calendar_token: crypto.randomUUID() })
    .eq("id", user.playerId);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

export async function regeneratePublicToken() {
  const user = await requireFreshUser();
  const { error } = await supabaseAdmin
    .from("players")
    .update({ public_token: crypto.randomUUID() })
    .eq("id", user.playerId);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

const VALID_FIELD_VISIBILITY = new Set(["private", "coach", "team", "public"]);

/** Centre de confidentialité — un niveau par champ personnel, plus l'activation du profil public. */
export async function updatePrivacySettings(formData: FormData) {
  const user = await requireFreshUser();

  const photoVisibility = String(formData.get("photo_visibility") ?? "team");
  const birthdayVisibility = String(formData.get("birthday_visibility") ?? "team");
  const measurementsVisibility = String(formData.get("measurements_visibility") ?? "team");
  const publicProfileEnabled = formData.get("public_profile_enabled") === "on";

  for (const v of [photoVisibility, birthdayVisibility, measurementsVisibility]) {
    if (!VALID_FIELD_VISIBILITY.has(v)) throw new Error("Visibilité invalide.");
  }

  const { error } = await supabaseAdmin
    .from("players")
    .update({
      photo_visibility: photoVisibility,
      birthday_visibility: birthdayVisibility,
      measurements_visibility: measurementsVisibility,
      public_profile_enabled: publicProfileEnabled,
    })
    .eq("id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
}
