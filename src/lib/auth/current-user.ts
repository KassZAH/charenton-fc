import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./session";

/** Lit et vérifie la session courante. Retourne null si non connecté. */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
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
