import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionAccordion } from "@/components/ui/SectionAccordion";
import { StandingsTable } from "./StandingsTable";
import { SyncFlaButton } from "./SyncFlaButton";
import { OpponentMappingManager } from "./OpponentMappingManager";
import { formatShortDate } from "@/lib/format";
import type { ExternalCompetition, ExternalStanding, OpponentExternalMapping } from "@/lib/fla/types";

/**
 * Onglet "Classement FLA" de /stats (roadmap V3, Lot 11.5, §10-12).
 * Distingue toujours empty (réponse valide, classement vide) de unavailable/
 * invalid_payload (problème technique) — jamais un tableau vide, jamais de
 * faux zéros, jamais une erreur rouge pour une simple absence de données.
 */
export function FlaStandingsSection({
  competition,
  standings,
  mappings,
  isOwner,
}: {
  competition: ExternalCompetition | null;
  standings: ExternalStanding[];
  mappings: OpponentExternalMapping[];
  isOwner: boolean;
}) {
  if (!competition) {
    return <EmptyState title="Classement pas encore configuré" text="Aucune compétition externe n'est configurée pour le moment." />;
  }

  const lastSyncLabel = competition.last_synced_at ? formatShortDate(competition.last_synced_at) : "jamais";
  const sourceLink = (
    <a href={competition.source_url} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-2">
      page officielle
    </a>
  );

  const header = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-steel/70">
      <div>
        <p className="font-semibold text-cream">{competition.competition_name ?? "Compétition FLA"}</p>
        <p>
          Source : FLA — {sourceLink} · Dernière synchronisation : {lastSyncLabel}
        </p>
      </div>
      {isOwner && <SyncFlaButton externalCompetitionId={competition.id} />}
    </div>
  );

  const showStandings = competition.last_sync_status === "success" && standings.length > 0;
  const isEmpty = competition.last_sync_status === null || competition.last_sync_status === "empty" || (competition.last_sync_status === "success" && standings.length === 0);
  const isUnavailable = competition.last_sync_status === "unavailable" || competition.last_sync_status === "invalid_payload";

  return (
    <div>
      {header}

      {showStandings && <StandingsTable standings={standings} internalTeamName={competition.internal_team_name} />}

      {isEmpty && (
        <EmptyState
          title="Classement pas encore disponible"
          text={`La FLA n'a pas encore publié de classement pour cette compétition. Championnat configuré : ${
            competition.competition_name ?? competition.external_championship_id
          } · Source : `}
        />
      )}

      {isUnavailable && (
        <ErrorState
          title="Classement indisponible"
          text={
            competition.last_sync_status === "invalid_payload"
              ? "La réponse de la FLA n'a pas pu être interprétée. Le dernier classement connu (s'il existe) reste affiché."
              : "La FLA est momentanément injoignable. Le dernier classement connu (s'il existe) reste affiché."
          }
        />
      )}

      {isOwner && (
        <div className="mt-4">
          <SectionAccordion title="Associations adversaires ↔ équipes FLA (Propriétaire)">
            <OpponentMappingManager mappings={mappings} standings={standings} />
          </SectionAccordion>
        </div>
      )}
    </div>
  );
}
