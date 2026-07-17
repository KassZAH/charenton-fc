import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getMatchesNeedingReview } from "@/lib/data/match-completeness";
import { formatMatchDate } from "@/lib/format";

export default async function MatchesReviewPage() {
  await requireAdmin();
  const items = await getMatchesNeedingReview();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-lg font-extrabold text-cream">Matchs à vérifier</h1>
      <p className="mb-6 text-sm text-steel/70">
        Matchs terminés dont la fiche n&apos;est pas complète (score, présents, buteurs, récompenses).
      </p>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-navy-card p-4 text-sm text-steel/70">
          Rien à vérifier — toutes les fiches de match sont complètes.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ match, completeness }) => {
            const isHome = match.home_or_away === "home";
            const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";
            const missing = completeness.items.filter((i) => i.status !== "ok").map((i) => i.label);
            return (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-cream">
                      {isHome ? "vs" : "@"} {opponentLabel}
                    </p>
                    <p className="text-xs text-steel">{formatMatchDate(match.match_date)}</p>
                    <p className="mt-1 text-xs text-gold">Manque : {missing.join(", ")}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gold">{completeness.percent}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
