"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import type { TablesUpdate } from "@/types/database";
import { pinLengthForRole } from "@/types/models";

export async function createPlayer(formData: FormData) {
  await requireAdmin();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "player");
  const shirtNumberRaw = String(formData.get("shirt_number") ?? "").trim();
  const primaryPosition = String(formData.get("primary_position") ?? "").trim() || null;
  const pin = String(formData.get("pin") ?? "").trim();

  if (!firstName) {
    throw new Error("Le prénom est obligatoire.");
  }
  if (role !== "player" && role !== "admin" && role !== "coach") {
    throw new Error("Rôle invalide.");
  }

  const expectedLength = pinLengthForRole(role);
  if (pin.length !== expectedLength || !/^\d+$/.test(pin)) {
    throw new Error(`Le PIN doit contenir ${expectedLength} chiffres.`);
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const { error } = await supabaseAdmin.from("players").insert({
    first_name: firstName,
    last_name: lastName,
    nickname,
    role,
    shirt_number: shirtNumberRaw ? Number(shirtNumberRaw) : null,
    primary_position: primaryPosition,
    pin_hash: pinHash,
    status: "active",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  redirect("/team");
}

export async function setPlayerStatus(playerId: string, status: "active" | "archived") {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("players")
    .update({ status, archived_at: status === "archived" ? new Date().toISOString() : null })
    .eq("id", playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath(`/team/${playerId}`);
}

export async function updatePlayer(playerId: string, formData: FormData) {
  const user = await requireAdmin();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "player");
  const shirtNumberRaw = String(formData.get("shirt_number") ?? "").trim();
  const primaryPosition = String(formData.get("primary_position") ?? "").trim() || null;
  const strongFoot = String(formData.get("strong_foot") ?? "").trim() || null;
  const quote = String(formData.get("quote") ?? "").trim() || null;
  const newPin = String(formData.get("new_pin") ?? "").trim();

  if (!firstName) {
    throw new Error("Le prénom est obligatoire.");
  }
  if (role !== "player" && role !== "admin" && role !== "coach") {
    throw new Error("Rôle invalide.");
  }

  const update: TablesUpdate<"players"> = {
    first_name: firstName,
    last_name: lastName,
    nickname,
    role,
    shirt_number: shirtNumberRaw ? Number(shirtNumberRaw) : null,
    primary_position: primaryPosition,
    strong_foot: strongFoot,
    quote,
  };

  if (newPin) {
    const expectedLength = pinLengthForRole(role);
    if (newPin.length !== expectedLength || !/^\d+$/.test(newPin)) {
      throw new Error(`Le nouveau PIN doit contenir ${expectedLength} chiffres.`);
    }
    update.pin_hash = await bcrypt.hash(newPin, 10);
  }

  const { data: before } = await supabaseAdmin.from("players").select("*").eq("id", playerId).maybeSingle();

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
  const user = await requireUser();

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

const VALID_FIELD_VISIBILITY = new Set(["private", "coach", "team", "public"]);

/** Centre de confidentialité — un niveau par champ personnel, plus l'activation du profil public. */
export async function updatePrivacySettings(formData: FormData) {
  const user = await requireUser();

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
