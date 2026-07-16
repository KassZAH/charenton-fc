"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
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
  await requireAdmin();

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

  const { error } = await supabaseAdmin.from("players").update(update).eq("id", playerId);
  if (error) throw new Error(error.message);

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
    })
    .eq("id", user.playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath(`/team/${user.playerId}`);
  revalidatePath("/team");
  redirect("/profile");
}
