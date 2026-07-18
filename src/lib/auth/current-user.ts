import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";

/**
 * Lit et vérifie la session courante. Le JWT ne fournit que playerId et
 * sessionVersion — rôle, nom et statut sont toujours relus en base, pour
 * qu'un changement de rôle/PIN/archivage prenne effet immédiatement au lieu
 * d'attendre l'expiration du cookie (180 jours).
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const raw = await verifySessionToken(token);
  if (!raw) return null;

  const { data: player, error } = await supabaseAdmin
    .from("players")
    .select("id, first_name, nickname, role, status, session_version")
    .eq("id", raw.playerId)
    .maybeSingle();

  if (error || !player || player.status !== "active") return null;
  if (player.session_version !== raw.sessionVersion) return null;
  if (player.role !== "player" && player.role !== "admin" && player.role !== "coach") return null;

  return {
    playerId: player.id,
    role: player.role,
    name: player.nickname || player.first_name,
  };
}

/** À utiliser dans les Server Components/Actions qui exigent une session valide. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * À utiliser dans les Server Components/Actions réservés aux admins.
 * Le rôle coach a exactement les mêmes droits qu'admin, donc il passe aussi
 * (y compris pour la feuille tactique, réservée à coach + admin).
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "coach") redirect("/");
  return user;
}
