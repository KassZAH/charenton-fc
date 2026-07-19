import type { MatchStatus } from "@/types/models";

/**
 * Matrice explicite des transitions autorisées (roadmap V3, Lot 14, V2 §5.1) —
 * toute transition hors de cette liste est refusée côté serveur, jamais
 * validée seulement côté client. 'completed' reste atteignable directement
 * depuis 'scheduled' (résultat express historique, sans passage par 'live')
 * aussi bien que depuis 'live' (Lot 15). Fonction pure, testable sans base —
 * séparée de match-lifecycle.ts ("use server" n'autorise que des exports
 * async).
 */
export const ALLOWED_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["live", "postponed", "cancelled", "completed"],
  postponed: ["scheduled", "cancelled"],
  live: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isTransitionAllowed(from: MatchStatus, to: MatchStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
