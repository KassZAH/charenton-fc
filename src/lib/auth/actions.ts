"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession, SESSION_COOKIE_NAME } from "./session";
import { pinLengthForRole } from "@/types/models";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 jours

type LoginResult = { error: string };

export async function login(playerId: string, pin: string): Promise<LoginResult> {
  const { data: player, error } = await supabaseAdmin
    .from("players")
    .select("id, role, first_name, nickname, pin_hash, status")
    .eq("id", playerId)
    .single();

  if (error || !player || player.status !== "active" || !player.pin_hash) {
    return { error: "Profil introuvable." };
  }

  if (player.role !== "player" && player.role !== "admin" && player.role !== "coach") {
    return { error: "Profil invalide." };
  }

  const expectedLength = pinLengthForRole(player.role);
  if (pin.length !== expectedLength || !/^\d+$/.test(pin)) {
    return { error: `Le PIN doit contenir ${expectedLength} chiffres.` };
  }

  const valid = await bcrypt.compare(pin, player.pin_hash);
  if (!valid) {
    return { error: "PIN incorrect." };
  }

  const token = await signSession({
    playerId: player.id,
    role: player.role,
    name: player.nickname || player.first_name,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/");
}

export async function logout(): Promise<never> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
