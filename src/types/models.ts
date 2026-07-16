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

/** players.role — confirmé sur les données de démo */
export type PlayerRole = "player" | "admin";

/** players.status — confirmé sur les données de démo (archivage = status "archived" + archived_at renseigné) */
export type PlayerStatus = "active" | "archived";

/** availability.status — pas encore de données démo, convention choisie pour la fiche de présence */
export type AvailabilityStatus = "present" | "unsure" | "absent" | "injured";

/** matches.status — confirmé sur les données de démo ("cancelled" ajouté par convention, pas encore utilisé) */
export type MatchStatus = "scheduled" | "completed" | "cancelled";

/** cards.card_type — pas encore de données démo, convention choisie */
export type CardType = "yellow" | "red";
