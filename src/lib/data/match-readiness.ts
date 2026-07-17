import "server-only";
import { getMatchAvailabilitySummary } from "./availability";
import { getMatchCarpoolSummary } from "./carpool";
import { getMatchEquipment } from "./equipment";

const MIN_PLAYERS = 8;

export type MatchReadiness = {
  presentCount: number;
  enoughPlayers: boolean;
  hasGoalkeeper: boolean;
  carpoolSufficient: boolean;
  ridersWaiting: number;
  unassignedEquipment: string[];
  warnings: string[];
};

/**
 * Détection des manques pour un match à venir — composé à partir de ce qui existe déjà
 * (présences, covoiturage, matériel) plutôt qu'une nouvelle saisie dédiée.
 */
export async function getMatchReadiness(matchId: string): Promise<MatchReadiness> {
  const [summary, carpool, equipment] = await Promise.all([
    getMatchAvailabilitySummary(matchId),
    getMatchCarpoolSummary(matchId),
    getMatchEquipment(matchId),
  ]);

  const present = summary.filter((s) => s.status === "present");
  const presentCount = present.length;
  const enoughPlayers = presentCount >= MIN_PLAYERS;
  const hasGoalkeeper = present.some((s) => s.player.primary_position === "Gardien");
  const carpoolSufficient = carpool.riders.length <= carpool.totalSeats;
  const unassignedEquipment = equipment.filter((e) => !e.assigned_player_id).map((e) => e.label);

  const warnings: string[] = [];
  if (!hasGoalkeeper) warnings.push("Aucun gardien confirmé");
  if (!enoughPlayers) {
    warnings.push(`Seulement ${presentCount} joueur${presentCount > 1 ? "s" : ""} confirmé${presentCount > 1 ? "s" : ""}`);
  }
  if (!carpoolSufficient) warnings.push("Pas assez de places en covoiturage");
  for (const label of unassignedEquipment) warnings.push(`Personne n'apporte : ${label}`);

  return {
    presentCount,
    enoughPlayers,
    hasGoalkeeper,
    carpoolSufficient,
    ridersWaiting: carpool.riders.length,
    unassignedEquipment,
    warnings,
  };
}
