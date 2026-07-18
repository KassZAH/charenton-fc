import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Bloque les écritures sur les matchs d'une saison verrouillée (clôturée).
 * Pas de case à cocher par formulaire : en cas de modification exceptionnelle,
 * l'admin déverrouille temporairement la saison depuis /admin/saisons (ce qui
 * crée déjà une sauvegarde + une trace), fait sa modification, puis reverrouille.
 */
export async function assertMatchSeasonUnlocked(matchId: string): Promise<void> {
  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("season_id")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!match?.season_id) return;

  const { data: season, error: seasonError } = await supabaseAdmin
    .from("seasons")
    .select("name, is_locked")
    .eq("id", match.season_id)
    .maybeSingle();
  if (seasonError) throw new Error(seasonError.message);

  if (season?.is_locked) {
    throw new Error(
      `La saison "${season.name}" est verrouillée en lecture seule. Déverrouille-la temporairement dans Admin > Saisons pour modifier ce match.`
    );
  }
}

/**
 * Une entrée de corbeille ou d'historique sur l'une de ces tables concerne
 * toujours un match précis — réutilisé par trash-actions.ts et
 * audit-actions.ts pour savoir quand appliquer assertMatchSeasonUnlocked().
 * Les autres tables (joueurs, cotisations, blessures, saisons...) continuent
 * de fonctionner sans vérification de verrouillage.
 */
export function isMatchScopedTable(tableName: string): boolean {
  return tableName === "matches" || tableName === "goals" || tableName === "cards";
}

/**
 * Pour une suppression annulée depuis l'historique, la ligne n'existe plus
 * dans la table elle-même : le seul match_id disponible est celui capturé
 * dans l'instantané pré-suppression (old_data), jamais une valeur reconstruite
 * autrement.
 */
export function matchIdFromDeletedRowSnapshot(oldData: Record<string, unknown> | null | undefined): string | null {
  const value = oldData?.match_id;
  return typeof value === "string" ? value : null;
}
