"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireFreshUser } from "./current-user";
import { signSession, SESSION_COOKIE_NAME } from "./session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours — doit rester aligné sur SESSION_DURATION (session.ts)

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

type LoginResult = { error: string };

export async function login(playerId: string, pin: string): Promise<LoginResult> {
  const { data: player, error } = await supabaseAdmin
    .from("players")
    .select(
      "id, role, first_name, nickname, pin_hash, pin_length, status, session_version, failed_pin_attempts, locked_until"
    )
    .eq("id", playerId)
    .single();

  if (error || !player || player.status !== "active" || !player.pin_hash) {
    return { error: "Profil introuvable." };
  }

  if (player.role !== "player" && player.role !== "coach") {
    return { error: "Profil invalide." };
  }

  if (player.locked_until && new Date(player.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(player.locked_until).getTime() - Date.now()) / 60000);
    return { error: `Trop de tentatives. Réessaie dans ${minutesLeft} min.` };
  }

  // La longueur attendue vient de players.pin_length (propre à chaque compte), plus
  // jamais du rôle — un PIN existant à 4 ou 6 chiffres reste valide indépendamment
  // d'une promotion/rétrogradation ultérieure (roadmap V3, Lot 5).
  if (pin.length !== player.pin_length || !/^\d+$/.test(pin)) {
    return { error: `Le PIN doit contenir ${player.pin_length} chiffres.` };
  }

  const valid = await bcrypt.compare(pin, player.pin_hash);
  if (!valid) {
    const attempts = player.failed_pin_attempts + 1;
    const lockedOut = attempts >= MAX_FAILED_ATTEMPTS;
    await supabaseAdmin
      .from("players")
      .update({
        failed_pin_attempts: lockedOut ? 0 : attempts,
        locked_until: lockedOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", player.id);
    return {
      error: lockedOut ? `Trop de tentatives. Réessaie dans ${LOCKOUT_MINUTES} min.` : "PIN incorrect.",
    };
  }

  await supabaseAdmin
    .from("players")
    .update({ failed_pin_attempts: 0, locked_until: null })
    .eq("id", player.id);

  const token = await signSession({
    playerId: player.id,
    sessionVersion: player.session_version,
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

/**
 * Déconnecte tous les appareils du joueur courant, pas seulement celui-ci —
 * incrémente session_version (même mécanisme que le changement de rôle/PIN),
 * ce qui invalide immédiatement tous les cookies déjà émis pour ce compte,
 * sur n'importe quel appareil, sans attendre leur expiration.
 */
export async function logoutAllDevices(): Promise<never> {
  const user = await requireFreshUser();

  const { data: current } = await supabaseAdmin
    .from("players")
    .select("session_version")
    .eq("id", user.playerId)
    .maybeSingle();

  await supabaseAdmin
    .from("players")
    .update({ session_version: (current?.session_version ?? 1) + 1 })
    .eq("id", user.playerId);

  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
