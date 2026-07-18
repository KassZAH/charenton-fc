import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";

/**
 * Lit et vérifie la session courante. Le JWT ne fournit que playerId et
 * sessionVersion — rôle, nom, statut et propriété du club sont toujours relus
 * en base, pour qu'un changement de rôle/PIN/archivage/transfert prenne effet
 * immédiatement au lieu d'attendre l'expiration du cookie.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const raw = await verifySessionToken(token);
  if (!raw) return null;

  const [{ data: player, error }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from("players")
      .select("id, first_name, nickname, role, status, session_version")
      .eq("id", raw.playerId)
      .maybeSingle(),
    supabaseAdmin.from("team_settings").select("owner_player_id").eq("id", 1).maybeSingle(),
  ]);

  if (error || !player || player.status !== "active") return null;
  if (player.session_version !== raw.sessionVersion) return null;
  if (player.role !== "player" && player.role !== "coach") return null;

  return {
    playerId: player.id,
    role: player.role,
    name: player.nickname || player.first_name,
    isOwner: player.id === settings?.owner_player_id,
  };
}

/** À utiliser dans les Server Components/Actions qui exigent une session valide. */
export async function requireFreshUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** À utiliser dans les Server Components/Actions réservés aux coachs. */
export async function requireFreshCoach(): Promise<SessionPayload> {
  const user = await requireFreshUser();
  if (user.role !== "coach") redirect("/");
  return user;
}

/**
 * Réservé au propriétaire du club (team_settings.owner_player_id), jamais
 * déterminé par le prénom, l'ordre de création ou une adresse e-mail.
 */
export async function requireOwner(): Promise<SessionPayload> {
  const user = await requireFreshCoach();
  if (!user.isOwner) redirect("/");
  return user;
}

/** @deprecated Alias de compatibilité — utiliser requireFreshUser(). Conservé pour éviter un renommage massif (roadmap V3 Lot 5). */
export const requireUser = requireFreshUser;

/** @deprecated Alias de compatibilité — utiliser requireFreshCoach(). Conservé pour éviter un renommage massif (roadmap V3 Lot 5). */
export const requireAdmin = requireFreshCoach;
