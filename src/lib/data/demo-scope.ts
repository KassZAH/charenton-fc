import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Mode Démo (présentation aux coachs, post-Macro B) — toute saison marquée is_demo=true doit
 * rester invisible des agrégats "toutes saisons confondues" (statistiques, rotation, fiabilité,
 * records, badges, mémoire du club...). Ces deux fonctions sont le point d'entrée unique de cette
 * exclusion : jamais de filtre ad hoc dupliqué par fichier. Cas normal (aucune saison Démo créée
 * ou déjà purgée) : tableaux vides, aucun appel réseau supplémentaire significatif, aucun
 * changement de comportement par rapport à avant le mode Démo.
 */

/**
 * IDs des saisons is_demo=true — normalement 0 ou 1. Jamais mis en cache d'une requête serveur à
 * l'autre (un module Next.js peut survivre à plusieurs requêtes sur la même instance) : un cache
 * périmé après la création/suppression du mode Démo serait exactement le genre de fuite que cette
 * fonction existe pour éliminer. Le coût d'une requête supplémentaire est négligeable ici.
 */
export async function getDemoSeasonIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("seasons").select("id").eq("is_demo", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => s.id);
}

/** IDs des matchs appartenant à une saison Démo — [] si aucune saison Démo (chemin rapide, aucune requête). */
export async function getDemoMatchIds(): Promise<string[]> {
  const demoSeasonIds = await getDemoSeasonIds();
  if (demoSeasonIds.length === 0) return [];

  const { data, error } = await supabaseAdmin.from("matches").select("id").in("season_id", demoSeasonIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => m.id);
}

/** La saison Démo actuelle (au plus une), ou null si aucune n'a encore été créée. */
export async function getDemoSeason(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabaseAdmin.from("seasons").select("id, name").eq("is_demo", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Vrai si ce match précis appartient à une saison Mode Démo — pour afficher le bandeau sur sa fiche. */
export async function isMatchInDemoSeason(matchId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("matches").select("season_id").eq("id", matchId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.season_id) return false;

  const demoSeasonIds = await getDemoSeasonIds();
  return demoSeasonIds.includes(data.season_id);
}
