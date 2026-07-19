import type { AvailabilityStatus, MatchStatus } from "@/types/models";

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  present: "Présent",
  uncertain: "Incertain",
  absent: "Absent",
  injured: "Blessé",
};

export const MATCH_TYPE_LABELS: Record<string, string> = {
  championnat: "Championnat",
  amical: "Amical",
  tournoi: "Tournoi",
  autre: "Autre",
};

/** Uniquement les statuts qui ne parlent pas déjà d'eux-mêmes dans l'UI existante (roadmap V3, Lot 14). */
export const MATCH_STATUS_LABELS: Partial<Record<MatchStatus, string>> = {
  draft: "Brouillon",
  live: "En cours",
  cancelled: "Annulé",
  postponed: "Reporté",
};
