"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";

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
  if (role !== "player" && role !== "admin") {
    throw new Error("Rôle invalide.");
  }

  const expectedLength = role === "admin" ? 6 : 4;
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

export async function archivePlayer(playerId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("players")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", playerId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
}
