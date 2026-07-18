import "server-only";

/**
 * Roadmap V3, Lot 2/7 : la clôture non destructive (closeSeasonAction, dans
 * seasons-actions.ts) est désormais l'unique parcours normal pour changer de
 * saison. resetSeasonData() reste dans le code (au cas où) mais est
 * désactivée par défaut — la réactiver est une décision délibérée, pas un
 * oubli. Constante isolée dans son propre fichier (pas "use server") pour
 * rester exportable et testable directement.
 */
export const SEASON_RESET_ENABLED = false;
