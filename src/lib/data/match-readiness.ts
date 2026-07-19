import "server-only";
import { getMatchAvailabilitySummary } from "./availability";
import { getMatchCarpoolSummary } from "./carpool";
import { getMatchEquipment } from "./equipment";
import { getMatchGoalkeepers } from "./roster";

const MIN_PLAYERS = 8;

export type MatchReadiness = {
  presentCount: number;
  respondedCount: number;
  /** Aucun joueur n'a encore répondu : trop tôt pour juger l'effectif/le gardien, jamais traité comme un manque. */
  awaitingResponses: boolean;
  enoughPlayers: boolean;
  hasGoalkeeper: boolean;
  carpoolSufficient: boolean;
  ridersWaiting: number;
  unassignedEquipment: string[];
  warnings: string[];
};

/**
 * Détection des manques pour un match à venir — composé à partir de ce qui existe déjà
 * (présences, covoiturage, matériel) plutôt qu'une nouvelle saisie dédiée (roadmap V3, Lot 12).
 *
 * "Pas encore configuré" doit toujours rester distinct d'un manque réel : tant qu'aucun joueur
 * n'a répondu, l'effectif et le gardien sont "en attente", jamais annoncés comme un problème.
 * Covoiturage et matériel sont déjà naturellement distincts (aucune ligne = aucune alerte).
 */
export async function getMatchReadiness(matchId: string): Promise<MatchReadiness> {
  const [summary, carpool, equipment, designatedGoalkeeperIds] = await Promise.all([
    getMatchAvailabilitySummary(matchId),
    getMatchCarpoolSummary(matchId),
    getMatchEquipment(matchId),
    getMatchGoalkeepers(matchId),
  ]);

  const present = summary.filter((s) => s.status === "present");
  const presentCount = present.length;
  const respondedCount = summary.filter((s) => s.status !== null).length;
  const awaitingResponses = respondedCount === 0;
  const enoughPlayers = presentCount >= MIN_PLAYERS;
  // Désignation réelle (Lot 13, match_players.goalkeeper) si la feuille de match existe déjà ;
  // sinon repli temporaire documenté sur le poste principal déclaré, seul signal disponible avant
  // toute confirmation de feuille — à retirer une fois le Lot 17 (groupe convoqué) construit.
  const hasGoalkeeper =
    designatedGoalkeeperIds.length > 0
      ? present.some((s) => designatedGoalkeeperIds.includes(s.player.id))
      : present.some((s) => s.player.primary_position === "Gardien");
  const carpoolSufficient = !carpool.hasDeficit;
  const unassignedEquipment = equipment.filter((e) => !e.assigned_player_id).map((e) => e.label);

  const warnings: string[] = [];
  if (!awaitingResponses) {
    if (!hasGoalkeeper) warnings.push("Aucun gardien confirmé");
    if (!enoughPlayers) {
      warnings.push(`Seulement ${presentCount} joueur${presentCount > 1 ? "s" : ""} confirmé${presentCount > 1 ? "s" : ""}`);
    }
  }
  if (!carpoolSufficient) warnings.push("Pas assez de places en covoiturage");
  for (const label of unassignedEquipment) warnings.push(`Personne n'apporte : ${label}`);

  return {
    presentCount,
    respondedCount,
    awaitingResponses,
    enoughPlayers,
    hasGoalkeeper,
    carpoolSufficient,
    ridersWaiting: carpool.unassignedRiders.length,
    unassignedEquipment,
    warnings,
  };
}
