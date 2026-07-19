/**
 * Roadmap V3, Lot 16 — un double-clic/double soumission sur "+ But"/"+ Carton"
 * pendant le live envoie deux fois la même idempotency_key ; la seconde
 * insertion viole l'index unique partiel (voir migration
 * 20260722000200_live_events_idempotency.sql) — traité comme un succès
 * silencieux, jamais une erreur affichée pour un événement déjà réellement
 * enregistré. Code Postgres 23505 = unique_violation.
 */
export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
