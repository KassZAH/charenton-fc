import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getUpcomingMatches, getPastMatches, type MatchWithOpponent } from "@/lib/data/matches";
import { formatMatchDate, formatTime } from "@/lib/format";
import { isElevatedRole } from "@/types/models";

export default async function MatchesPage() {
  const user = await requireUser();
  const [upcoming, past] = await Promise.all([getUpcomingMatches(), getPastMatches()]);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy">Matchs</h1>
        {isElevatedRole(user.role) && (
          <Link
            href="/matches/new"
            className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-gold"
          >
            + Nouveau match
          </Link>
        )}
      </div>

      {upcoming.length > 0 && (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a
          href="/matches/calendar"
          className="mb-4 inline-block text-xs font-medium text-navy/60 underline underline-offset-2"
        >
          Ajouter les matchs à venir à mon calendrier
        </a>
      )}

      <h2 className="mb-2 text-sm font-semibold text-navy/60">À venir</h2>
      <ul className="mb-6 space-y-2">
        {upcoming.length === 0 && <li className="text-sm text-navy/50">Aucun match à venir.</li>}
        {upcoming.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>

      <h2 className="mb-2 text-sm font-semibold text-navy/60">Terminés</h2>
      <ul className="space-y-2">
        {past.length === 0 && <li className="text-sm text-navy/50">Aucun match joué.</li>}
        {past.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>
    </div>
  );
}

function MatchRow({ match }: { match: MatchWithOpponent }) {
  const isHome = match.home_or_away === "home";
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="flex items-center justify-between rounded-xl border border-navy/10 bg-white p-3"
      >
        <div>
          <p className="text-sm font-semibold text-navy">
            {isHome ? "vs" : "@"} {opponentLabel}
          </p>
          <p className="text-xs text-navy/60">
            {formatMatchDate(match.match_date)}
            {match.kickoff_time ? ` · ${formatTime(match.kickoff_time)}` : ""}
          </p>
        </div>
        {match.status === "completed" ? (
          <span className="text-sm font-bold text-navy">
            {match.team_score}–{match.opponent_score}
          </span>
        ) : (
          <span className="text-sm font-semibold text-gold">→</span>
        )}
      </Link>
    </li>
  );
}
