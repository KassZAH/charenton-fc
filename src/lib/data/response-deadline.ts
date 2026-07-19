/**
 * Vrai si `respondedAt` tombe après `deadline` — pas de deadline (match sans date limite) =
 * jamais en retard. Fonction pure (Lot 20, roadmap V3), figée au moment de la première réponse
 * du joueur, jamais recalculée si la réponse change ensuite (voir upsertAvailability dans
 * matches-actions.ts). L'exclusion des blessés/archivés/déjà répondu pour la relance est déjà
 * couverte par le regroupement `grouped.none` existant (matches/[id]/page.tsx, alimenté par
 * getActivePlayers + getMatchAvailabilitySummary) — pas dupliquée ici.
 */
export function computeLateResponse(respondedAt: Date, deadline: string | null): boolean {
  if (!deadline) return false;
  return respondedAt.getTime() > new Date(deadline).getTime();
}
