import type { OpponentStandingResult } from "@/lib/data/opponent-standings-lookup";

function ordinal(n: number): string {
  return `${n}e`;
}

/**
 * Résumé compact du classement FLA d'un adversaire (roadmap V3, Lot 11.5,
 * §13) — jamais de faux zéro : si une statistique individuelle est absente
 * (null), elle est simplement omise du résumé plutôt que remplacée par 0.
 */
export function OpponentStandingSummary({
  result,
  isOwner,
  emptyFallback = "hidden",
}: {
  result: OpponentStandingResult;
  isOwner: boolean;
  /** "hidden" (rien) ou "coming-soon" ("Classement à venir") quand aucune donnée fiable n'existe. */
  emptyFallback?: "hidden" | "coming-soon";
}) {
  if (result.kind === "ambiguous") {
    if (!isOwner) return null;
    return <span className="text-[11px] font-medium text-gold">⚠️ Association d&apos;équipe à vérifier</span>;
  }

  if (result.kind === "no-data") {
    if (emptyFallback === "hidden") return null;
    return <span className="text-[11px] text-steel/60">Classement à venir</span>;
  }

  const s = result.standing;
  const hasRecord = s.wins !== null && s.draws !== null && s.losses !== null;
  const hasGoals = s.goals_for !== null && s.goals_against !== null;

  const desktopParts: string[] = [];
  const mobileParts: string[] = [];
  const accessibleParts: string[] = [];

  if (s.position !== null) {
    desktopParts.push(ordinal(s.position));
    mobileParts.push(ordinal(s.position));
    accessibleParts.push(`${ordinal(s.position)} du championnat`);
  }
  if (hasRecord) {
    desktopParts.push(`${s.wins}V ${s.draws}N ${s.losses}D`);
    mobileParts.push(`${s.wins}V-${s.draws}N-${s.losses}D`);
    accessibleParts.push(`${s.wins} victoire${s.wins! > 1 ? "s" : ""}`, `${s.draws} nul${s.draws! > 1 ? "s" : ""}`, `${s.losses} défaite${s.losses! > 1 ? "s" : ""}`);
  }
  if (hasGoals) {
    desktopParts.push(`BM ${s.goals_for}`, `BE ${s.goals_against}`);
    mobileParts.push(`${s.goals_for}:${s.goals_against}`);
    accessibleParts.push(`${s.goals_for} buts marqués`, `${s.goals_against} buts encaissés`);
  }

  if (desktopParts.length === 0) {
    return emptyFallback === "coming-soon" ? <span className="text-[11px] text-steel/60">Classement à venir</span> : null;
  }

  return (
    <span className="text-[11px] font-medium text-steel/80" aria-label={accessibleParts.join(", ") + "."}>
      <span aria-hidden="true" className="hidden sm:inline">
        {desktopParts.join(" · ")}
      </span>
      <span aria-hidden="true" className="sm:hidden">
        {mobileParts.join(" · ")}
      </span>
    </span>
  );
}
