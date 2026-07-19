import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getUpcomingMatches, getPastMatches, type MatchWithOpponent } from "@/lib/data/matches";
import { formatMatchDate, formatTime } from "@/lib/format";
import { isElevatedRole } from "@/types/models";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";

export default async function MatchesPage() {
  const user = await requireUser();
  const [upcoming, past] = await Promise.all([getUpcomingMatches(), getPastMatches()]);

  return (
    <ResponsivePageContainer size="wide">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Matchs</h1>
        {isElevatedRole(user.role) && (
          <div className="flex gap-2">
            <Link
              href="/matches/review"
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80"
            >
              À vérifier
            </Link>
            <Link
              href="/matches/new"
              className="rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep"
            >
              + Nouveau match
            </Link>
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a
          href="/matches/calendar"
          className="mb-4 inline-block text-xs font-medium text-steel underline underline-offset-2"
        >
          Ajouter les matchs à venir à mon calendrier
        </a>
      )}

      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">À venir</h2>
      <ul className="mb-6 space-y-2">
        {upcoming.length === 0 && <li className="text-sm text-steel/70">Aucun match à venir.</li>}
        {upcoming.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Terminés</h2>
      <ul className="space-y-2">
        {past.length === 0 && <li className="text-sm text-steel/70">Aucun match joué.</li>}
        {past.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>
    </ResponsivePageContainer>
  );
}

function MatchRow({ match }: { match: MatchWithOpponent }) {
  const isHome = match.home_or_away === "home";
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
      >
        <div>
          <p className="text-sm font-semibold text-cream">
            {isHome ? "vs" : "@"} {opponentLabel}
          </p>
          <p className="text-xs text-steel">
            {formatMatchDate(match.match_date)}
            {match.kickoff_time ? ` · ${formatTime(match.kickoff_time)}` : ""}
          </p>
        </div>
        {match.status === "completed" ? (
          <span className="text-sm font-bold tabular-nums text-gold">
            {match.team_score}–{match.opponent_score}
          </span>
        ) : (
          <span className="text-sm font-bold text-gold">→</span>
        )}
      </Link>
    </li>
  );
}
