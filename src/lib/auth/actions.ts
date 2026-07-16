"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession, SESSION_COOKIE_NAME } from "./session";

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

  if (player.role !== "player" && player.role !== "admin") {
    return { error: "Profil invalide." };
  }

  const expectedLength = player.role === "admin" ? 6 : 4;
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
