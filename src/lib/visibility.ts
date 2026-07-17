import type { PlayerRole } from "@/types/models";

/**
 * Niveaux de visibilité réutilisés partout où une info doit rester contrôlable
 * par son propriétaire (blessures, mesures, objectifs perso, etc.) plutôt que
 * fixée une fois pour toutes dans le code.
 */
export type Visibility = "private" | "coach" | "team" | "public";

export type Viewer = {
  playerId: string;
  role: PlayerRole;
};

const ELEVATED_ROLES: PlayerRole[] = ["admin", "coach"];

/**
 * Est-ce que `viewer` peut voir une info appartenant à `ownerId`, réglée sur `visibility` ?
 * Le propriétaire et les rôles admin/coach voient toujours tout, quelle que soit la visibilité.
 */
export function canView(visibility: Visibility, ownerId: string, viewer: Viewer | null): boolean {
  if (visibility === "public") return true;
  if (!viewer) return false;
  if (viewer.playerId === ownerId) return true;
  if (ELEVATED_ROLES.includes(viewer.role)) return true;
  if (visibility === "coach") return false;
  if (visibility === "team") return true;
  return false;
}
