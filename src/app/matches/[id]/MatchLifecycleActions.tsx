import { transitionMatchStatus } from "@/lib/data/match-lifecycle";
import { isTransitionAllowed } from "@/lib/data/match-lifecycle-rules";
import type { MatchStatus } from "@/types/models";

const BUTTON_LABELS: Partial<Record<MatchStatus, string>> = {
  scheduled: "Reprogrammer",
  live: "▶ Démarrer le match",
  postponed: "Reporter",
  cancelled: "Annuler le match",
};

/**
 * Boutons de transition de statut (roadmap V3, Lot 14) — n'affiche jamais un
 * bouton vers une transition refusée par la matrice ; toute la validation
 * réelle reste côté serveur (transitionMatchStatus), ceci n'est qu'un
 * raccourci d'affichage.
 */
export function MatchLifecycleActions({ matchId, status }: { matchId: string; status: MatchStatus }) {
  const candidates: Exclude<MatchStatus, "completed">[] = ["scheduled", "live", "postponed", "cancelled"];
  const available = candidates.filter((target) => isTransitionAllowed(status, target));
  if (available.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
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
