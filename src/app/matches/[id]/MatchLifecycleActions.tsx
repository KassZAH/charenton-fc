import Link from "next/link";
import { transitionMatchStatus } from "@/lib/data/match-lifecycle";
import { startMatch } from "@/lib/data/live-match-actions";
import { isTransitionAllowed } from "@/lib/data/match-lifecycle-rules";
import type { MatchStatus } from "@/types/models";

const BUTTON_LABELS: Partial<Record<MatchStatus, string>> = {
  scheduled: "Reprogrammer",
  postponed: "Reporter",
  cancelled: "Annuler le match",
};

/**
 * Boutons de transition de statut (roadmap V3, Lots 14-15) — n'affiche
 * jamais un bouton vers une transition refusée par la matrice ; toute la
 * validation réelle reste côté serveur (transitionMatchStatus/startMatch),
 * ceci n'est qu'un raccourci d'affichage.
 */
export function MatchLifecycleActions({ matchId, status }: { matchId: string; status: MatchStatus }) {
  if (status === "live") {
    return (
      <div className="mt-3">
        <Link
          href={`/matches/${matchId}/live`}
          className="inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy-deep"
        >
          🔴 Ouvrir le match en cours
        </Link>
      </div>
    );
  }

  const candidates: Exclude<MatchStatus, "completed" | "live">[] = ["scheduled", "postponed", "cancelled"];
  const available = candidates.filter((target) => isTransitionAllowed(status, target));
  const canStartLive = isTransitionAllowed(status, "live");
  if (available.length === 0 && !canStartLive) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canStartLive && (
        <form action={startMatch.bind(null, matchId)}>
          <button type="submit" className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy-deep">
            ▶ Démarrer le match
          </button>
        </form>
      )}
      {available.map((target) => (
        <form key={target} action={transitionMatchStatus.bind(null, matchId, target)}>
          <button
            type="submit"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-cream/80"
          >
            {BUTTON_LABELS[target] ?? target}
          </button>
        </form>
      ))}
    </div>
  );
}
