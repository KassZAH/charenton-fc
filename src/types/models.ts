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

/** players.role — confirmé sur les données de démo */
export type PlayerRole = "player" | "admin";

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
