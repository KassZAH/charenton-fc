import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { currentMvpMonth, getMonthlyMvpCandidates, getMonthlyMvpTally, getMyMonthlyMvpVote } from "@/lib/data/monthly-mvp";
import { getSeasonBingo } from "@/lib/data/season-bingo";
import { getCollectiveChallenges } from "@/lib/data/collective-challenges";
import { getActiveSeasonId } from "@/lib/data/seasons";
import { MvpVoting } from "./MvpVoting";

const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function TropheesPage() {
  const user = await requireUser();
  const { year, month } = currentMvpMonth();
  const activeSeasonId = await getActiveSeasonId();

  const [candidates, tally, myVote, bingo, challenges] = await Promise.all([
    getMonthlyMvpCandidates(year, month),
    getMonthlyMvpTally(year, month),
    getMyMonthlyMvpVote(year, month, user.playerId),
    getSeasonBingo(activeSeasonId),
    getCollectiveChallenges(activeSeasonId),
  ]);

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Trophées</h1>
        <Link href="/stats" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Stats
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium">
        <Link href="/trophees/saison" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          🏅 Trophées de fin de saison
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">
          Joueur du mois — {MONTH_LABELS[month - 1]} {year}
        </h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-steel/70">Pas encore assez de matchs ce mois-ci.</p>
        ) : (
          <MvpVoting candidates={candidates} tally={tally} myVote={myVote} />
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Bingo de saison</h2>
        <div className="grid grid-cols-2 gap-2">
          {bingo.map((square) => {
            const content = (
              <>
                <p className="text-lg">{square.achieved ? "✅" : "⬜"}</p>
                <p className="text-xs font-semibold text-cream">{square.label}</p>
                {square.achieved && square.detail && <p className="mt-0.5 text-[10px] text-steel/70">{square.detail}</p>}
              </>
            );
            return square.href ? (
              <Link
                key={square.key}
                href={square.href}
                className="rounded-xl border border-gold/20 bg-navy-card p-3 text-center"
              >
                {content}
              </Link>
            ) : (
              <div key={square.key} className="rounded-xl border border-white/10 bg-navy-card p-3 text-center">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Défis collectifs</h2>
        <ul className="space-y-1.5">
          {challenges.map((c) => (
            <li key={c.key} className="rounded-xl border border-white/10 bg-navy-card px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cream">
                  {c.achieved ? "✅ " : ""}
                  {c.title}
                </span>
                <span className="text-sm font-bold tabular-nums text-gold">
                  {c.current}
                  {c.unit ? ` ${c.unit}` : ""} / {c.target}
                  {c.unit ? ` ${c.unit}` : ""}
                </span>
              </div>
              {!c.achieved && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${Math.min(100, Math.round((c.current / c.target) * 100))}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
