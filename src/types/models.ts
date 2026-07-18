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
export type MatchEquipmentItem = Tables<"match_equipment_items">;
export type ReinforcementCall = Tables<"reinforcement_calls">;
export type HallOfFameEntry = Tables<"hall_of_fame_entries">;
export type ClubQuote = Tables<"club_quotes">;
export type JerseyHistoryEntry = Tables<"jersey_history_entries">;
export type MonthlyMvpVote = Tables<"monthly_mvp_votes">;
export type SeasonTrophy = Tables<"season_trophies">;
export type Backup = Tables<"backups">;
export type PlayerGoal = Tables<"player_goals">;

/**
 * players.role — "admin" a existé comme valeur legacy jusqu'à l'Étape C du
 * Lot 5 (roadmap V3) : toutes les lignes ont été migrées vers "coach" (0
 * ligne "admin" en base). La contrainte SQL players_role_check accepte
 * encore "admin" jusqu'à l'Étape D2 (retrait prévu, aucune ligne concernée) ;
 * ce type resserré à "player" | "coach" reflète la valeur métier réellement
 * utilisée par le code. Le propriétaire n'est pas un rôle distinct — voir
 * SessionPayload.isOwner et team_settings.owner_player_id.
 */
export type PlayerRole = "player" | "coach";

/** Longueur de PIN pour un nouveau compte ou un changement volontaire de PIN — plus jamais dérivée du rôle. */
export const NEW_PIN_LENGTH = 6;

/** Retourne le message d'erreur si le PIN est invalide, sinon null — utilisé côté serveur (players-actions.ts) et testable sans base de données. */
export function validateNewPin(pin: string): string | null {
  if (pin.length !== NEW_PIN_LENGTH || !/^\d+$/.test(pin)) {
    return `Le PIN doit contenir exactement ${NEW_PIN_LENGTH} chiffres.`;
  }
  return null;
}

/**
 * Accepte `string` (pas seulement PlayerRole) pour pouvoir être appelée
 * directement sur players.role tel que renvoyé par Supabase, sans caster à
 * chaque site d'appel. "admin" n'est plus une valeur élevée reconnue
 * (roadmap V3, Lot 5, Étape D — 0 ligne "admin" en base depuis l'Étape C).
 */
export function isElevatedRole(role: string): boolean {
  return role === "coach";
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

/** goals.credited_to — contrainte check en base. À qui profite le but (utile pour les CSC). */
export type GoalCreditedTo = "charenton" | "opponent";

/** reinforcement_calls.position_needed — contrainte check en base. */
export type ReinforcementPosition = "gardien" | "defenseur" | "joueur_de_champ";

export const REINFORCEMENT_POSITION_LABELS: Record<ReinforcementPosition, string> = {
  gardien: "Gardien",
  defenseur: "Défenseur",
  joueur_de_champ: "Joueur de champ",
};

/** Durées rapides proposées à la déclaration d'une blessure — traduites en date estimée côté serveur. */
export type InjuryDurationPreset = "next_match" | "1_week" | "2_weeks" | "1_month" | "custom_date" | "unknown";

/** backups.trigger_reason — contrainte check en base. */
export type BackupTriggerReason = "manual" | "before_reset" | "weekly" | "end_of_season";

export const BACKUP_TRIGGER_LABELS: Record<BackupTriggerReason, string> = {
  manual: "Manuelle",
  before_reset: "Avant réinitialisation",
  weekly: "Hebdomadaire",
  end_of_season: "Fin de saison",
};

/** hall_of_fame_entries.category — contrainte check en base. */
export type HallOfFameCategory =
  | "fondateur"
  | "capitaine_emblematique"
  | "meilleur_buteur_historique"
  | "legende_vestiaire"
  | "autre";

export const HALL_OF_FAME_CATEGORY_LABELS: Record<HallOfFameCategory, string> = {
  fondateur: "Fondateur",
  capitaine_emblematique: "Capitaine emblématique",
  meilleur_buteur_historique: "Meilleur buteur historique",
  legende_vestiaire: "Légende du vestiaire",
  autre: "Autre",
};

/** season_trophies.category — contrainte check en base. */
export type SeasonTrophyCategory =
  | "joueur_de_la_saison"
  | "meilleur_buteur"
  | "meilleur_passeur"
  | "mur_de_la_saison"
  | "revelation"
  | "plus_grande_vendange"
  | "meilleure_ambiance"
  | "action_la_plus_improbable"
  | "plus_grande_disparition_whatsapp"
  | "meilleur_moment_de_la_saison"
  | "autre";

export const SEASON_TROPHY_CATEGORY_LABELS: Record<SeasonTrophyCategory, string> = {
  joueur_de_la_saison: "Joueur de la saison",
  meilleur_buteur: "Meilleur buteur",
  meilleur_passeur: "Meilleur passeur",
  mur_de_la_saison: "Mur de la saison",
  revelation: "Révélation",
  plus_grande_vendange: "Plus grande vendange",
  meilleure_ambiance: "Meilleure ambiance",
  action_la_plus_improbable: "Action la plus improbable",
  plus_grande_disparition_whatsapp: "Plus grande disparition WhatsApp",
  meilleur_moment_de_la_saison: "Meilleur moment de la saison",
  autre: "Autre",
};
