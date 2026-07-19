/**
 * Types partagés pour l'intégration de classements externes (roadmap V3,
 * Lot 11.5). `provider` reste un texte libre (pas un enum figé) : "fla"
 * aujourd'hui, potentiellement d'autres fournisseurs plus tard sans
 * migration de schéma.
 */

export type SyncStatus = "success" | "empty" | "unavailable" | "invalid_payload" | "disabled";

export type MappingStatus = "automatic" | "confirmed" | "ambiguous" | "unmatched" | "disabled";

/** Une ligne de classement telle que produite par un fournisseur, avant persistance. null = information absente, jamais 0. */
export type StandingRow = {
  externalTeamId: string | null;
  teamName: string;
  normalizedTeamName: string;
  position: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  points: number | null;
};

export type CompetitionMetadata = {
  competitionName: string | null;
};

/** Résultat d'une tentative de récupération — jamais d'exception non typée qui remonterait un contenu brut. */
export type FetchStandingsResult =
  | { status: "success"; standings: StandingRow[]; metadata: CompetitionMetadata }
  | { status: "empty"; metadata: CompetitionMetadata }
  | { status: "unavailable"; errorMessage: string }
  | { status: "invalid_payload"; errorMessage: string };

export type ExternalCompetition = {
  id: string;
  provider: string;
  external_championship_id: string;
  external_season_id: string;
  internal_season_id: string | null;
  competition_name: string | null;
  internal_team_name: string;
  source_url: string;
  sync_enabled: boolean;
  last_sync_status: SyncStatus | null;
  last_synced_at: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ExternalStanding = {
  id: string;
  external_competition_id: string;
  external_team_id: string | null;
  team_name: string;
  normalized_team_name: string;
  position: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goals_for: number | null;
  goals_against: number | null;
  goal_difference: number | null;
  points: number | null;
  fetched_at: string;
};

export type OpponentExternalMapping = {
  id: string;
  external_competition_id: string;
  app_opponent_name: string;
  normalized_app_opponent_name: string;
  external_team_id: string | null;
  external_team_name: string | null;
  mapping_status: MappingStatus;
  confirmed_by_player_id: string | null;
  confirmed_at: string | null;
};

/**
 * Abstraction fournisseur (LeagueStandingsProvider) — une implémentation par
 * source externe. FlaStandingsProvider (fla-provider.ts) est la seule à ce
 * jour.
 */
export type LeagueStandingsProvider = {
  provider: string;
  /** Construit l'URL officielle depuis des identifiants contrôlés — jamais une URL libre. */
  buildSourceUrl(championshipId: string, seasonId: string): string;
  fetchCompetitionMetadata(championshipId: string, seasonId: string): Promise<CompetitionMetadata>;
  fetchStandings(championshipId: string, seasonId: string): Promise<FetchStandingsResult>;
};
