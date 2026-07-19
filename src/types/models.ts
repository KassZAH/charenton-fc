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
export type BackupArtifact = Tables<"backup_artifacts">;
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
export type MatchStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled" | "postponed";

/** Distinct de MatchStatus : fiabilité des données une fois le match joué (roadmap V3, Lot 14). */
export type MatchCompletionStatus = "not_started" | "incomplete" | "under_review" | "validated";

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

/** player_restrictions.restriction_types (élément du tableau) — contrainte check en base (Lot 19, roadmap V3). */
export type RestrictionType =
  | "no_goalkeeper"
  | "no_defence"
  | "no_attack"
  | "no_intense_running"
  | "limited_play_time"
  | "progressive_return"
  | "custom";

export const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  no_goalkeeper: "Pas gardien",
  no_defence: "Pas défenseur",
  no_attack: "Pas attaquant",
  no_intense_running: "Pas de course intense",
  limited_play_time: "Temps de jeu limité",
  progressive_return: "Retour progressif",
  custom: "Autre",
};

/** player_restrictions.status — contrainte check en base. */
export type RestrictionStatus = "active" | "ended";

/** player_restrictions.visibility — contrainte check en base. Jamais un niveau "public". */
export type RestrictionVisibility = "private" | "coaches" | "team";

/**
 * player_restrictions n'est pas dans les types Supabase générés (jamais régénérés depuis le
 * Lot 17, même choix que MatchSquadEntry dans match-squad.ts) — type manuel, lu/écrit via
 * untypedDb comme les autres tables ajoutées depuis.
 */
export type PlayerRestriction = {
  id: string;
  player_id: string;
  starts_at: string;
  ends_at: string | null;
  status: RestrictionStatus;
  restriction_types: RestrictionType[];
  comment: string | null;
  visibility: RestrictionVisibility;
  created_at: string;
  created_by_player_id: string | null;
  ended_at: string | null;
};

/** venues — pas dans les types générés (Lot 22, roadmap V3), même convention que PlayerRestriction. */
export type Venue = {
  id: string;
  name: string;
  address: string | null;
  maps_url: string | null;
  parking_info: string | null;
  changing_rooms_info: string | null;
  access_code: string | null;
  surface_type: string | null;
  lighting: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** match_equipment_items.status — contrainte check en base (Lot 24, roadmap V3). Remplace `brought` (conservé pour transition, non lu par le code applicatif). */
export type EquipmentStatus = "unassigned" | "assigned" | "confirmed" | "brought" | "forgotten";

/** checklist_templates — pas dans les types générés (Lot 24, roadmap V3). */
export type ChecklistTemplate = {
  id: string;
  label: string;
  created_at: string;
};

/** player_checklist_preferences — pas dans les types générés (Lot 24, roadmap V3). */
export type PlayerChecklistPreference = {
  id: string;
  player_id: string;
  label: string;
  created_at: string;
};

/** match_checklist_items.source — contrainte check en base. */
export type ChecklistItemSource = "template" | "personal" | "contextual";

/** match_checklist_items — pas dans les types générés (Lot 24, roadmap V3). Strictement privé par joueur. */
export type MatchChecklistItem = {
  id: string;
  match_id: string;
  player_id: string;
  label: string;
  source: ChecklistItemSource;
  checked: boolean;
  created_at: string;
};

/** carpool_assignments — pas dans les types générés (Lot 23, roadmap V3). */
export type CarpoolAssignment = {
  id: string;
  match_id: string;
  driver_player_id: string;
  passenger_player_id: string;
  created_at: string;
};

/** match_templates.home_or_away — contrainte check en base. */
export type MatchTemplateHomeOrAway = "home" | "away";

/** match_templates — pas dans les types générés (Lot 22, roadmap V3). */
export type MatchTemplate = {
  id: string;
  name: string;
  venue_id: string | null;
  kickoff_time: string | null;
  meeting_offset_minutes: number | null;
  match_type: string | null;
  home_or_away: MatchTemplateHomeOrAway | null;
  max_players: number | null;
  default_equipment_items: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** backups.trigger_reason — contrainte check en base (étendue au Lot 6, roadmap V3). */
export type BackupTriggerReason =
  | "manual"
  | "weekly"
  | "before_reset"
  | "before_restore"
  | "before_migration"
  | "before_fusion"
  | "before_unlock"
  | "end_of_season";

export const BACKUP_TRIGGER_LABELS: Record<BackupTriggerReason, string> = {
  manual: "Manuelle",
  weekly: "Hebdomadaire",
  before_reset: "Avant réinitialisation",
  before_restore: "Avant restauration",
  before_migration: "Avant migration",
  before_fusion: "Avant fusion",
  before_unlock: "Avant déverrouillage",
  end_of_season: "Fin de saison",
};

/**
 * backups.backup_type — catégorie large, toujours dérivée de trigger_reason
 * côté code (voir backupTypeForTriggerReason dans backup-integrity.ts),
 * jamais fournie séparément par l'appelant.
 */
export type BackupType = "manual" | "routine" | "pre_operation" | "end_of_season";

export const BACKUP_TYPE_LABELS: Record<BackupType, string> = {
  manual: "Manuelle",
  routine: "Routine",
  pre_operation: "Avant opération",
  end_of_season: "Fin de saison",
};

/** backup_artifacts.artifact_type — un seul type au Lot 6 (roadmap V3). */
export type BackupArtifactType = "audit_log";

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
