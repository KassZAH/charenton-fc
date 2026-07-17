import type { Tables } from "@/types/database";

export type Player = Tables<"players">;
export type Match = Tables<"matches">;
export type Availability = Tables<"availability">;
export type MatchPlayer = Tables<"match_players">;
export type Goal = Tables<"goals">;
export type Card = Tables<"cards">;
export type Award = Tables<"awards">;
export type MatchAward = Tables<"match_awards">;
export type Vote = Tables<"votes">;
export type Season = Tables<"seasons">;
export type Opponent = Tables<"opponents">;
export type TeamSettings = Tables<"team_settings">;
export type PlayerMeasurement = Tables<"player_measurements">;
export type MatchLineup = { formation: string; positions: Record<string, string> };
export type Injury = Tables<"injuries">;

/** players.role — coach a les mêmes droits qu'admin, + la feuille tactique */
export type PlayerRole = "player" | "admin" | "coach";

/** PIN à 4 chiffres pour un joueur, 6 pour un admin ou un coach. */
export function pinLengthForRole(role: PlayerRole): 4 | 6 {
  return role === "player" ? 4 : 6;
}

/** Coach a exactement les mêmes droits qu'admin dans toute l'interface. */
export function isElevatedRole(role: PlayerRole): boolean {
  return role === "admin" || role === "coach";
}

/** players.status — confirmé sur les données de démo (archivage = status "archived" + archived_at renseigné) */
export type PlayerStatus = "active" | "archived";

/** availability.status — contrainte check en base : present/uncertain/absent/injured/no_response */
export type AvailabilityStatus = "present" | "uncertain" | "absent" | "injured";

/** matches.status — contrainte check en base */
export type MatchStatus = "scheduled" | "completed" | "cancelled" | "postponed" | "draft";

/** cards.card_type — contrainte check en base */
export type CardType = "yellow" | "red";

/** matches.match_type — contrainte check en base */
export type MatchType = "amical" | "championnat" | "tournoi" | "autre";

/** injuries.status — contrainte check en base */
export type InjuryStatus = "active" | "closed" | "cancelled";

/** Durées rapides proposées à la déclaration d'une blessure — traduites en date estimée côté serveur. */
export type InjuryDurationPreset = "next_match" | "1_week" | "2_weeks" | "1_month" | "custom_date" | "unknown";
