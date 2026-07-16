import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getNextMatch } from "@/lib/data/matches";
import { getMyAvailability } from "@/lib/data/availability";
import { getPlayerStats } from "@/lib/data/player-stats";
import { getTeamStats } from "@/lib/data/stats";
import { formatMatchDate, formatTime } from "@/lib/format";
import { AvailabilityButtons } from "./matches/[id]/AvailabilityButtons";

export default async function HomePage() {
  const user = await requireUser();
  const [nextMatch, myStats, teamStats] = await Promise.all([
    getNextMatch(),
    getPlayerStats(user.playerId),
    getTeamStats(),
  ]);
  const myStatus = nextMatch ? await getMyAvailability(nextMatch.id, user.playerId) : null;

  const isHome = nextMatch?.home_or_away === "home";
  const opponentLabel = nextMatch?.opponent_name ?? "Adversaire à confirmer";

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-lg font-bold text-navy">Salut {user.name}</h1>
      <p className="mb-6 text-sm text-navy/60">Bienvenue sur l&apos;espace Charenton FC.</p>

      {nextMatch ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <Link href={`/matches/${nextMatch.id}`} className="block active:opacity-80 transition">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">
              Prochain match
            </p>
            <p className="text-base font-bold text-navy">
              {isHome ? "Charenton FC" : opponentLabel} vs {isHome ? opponentLabel : "Charenton FC"}
            </p>
            <p className="mt-1 text-sm text-navy/70">
              {formatMatchDate(nextMatch.match_date)}
              {nextMatch.kickoff_time ? ` · ${formatTime(nextMatch.kickoff_time)}` : ""}
            </p>
            {nextMatch.location && <p className="text-sm text-navy/70">{nextMatch.location}</p>}
          </Link>

          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-navy">Ta présence</p>
            <AvailabilityButtons matchId={nextMatch.id} initialStatus={myStatus} />
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-navy/60">
          Aucun match à venir pour le moment.
        </p>
      )}

      <Link
        href={`/team/${user.playerId}`}
        className="mt-4 block rounded-2xl border border-navy/10 bg-white p-4 shadow-sm active:scale-[0.99] transition"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
          Ta saison
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Buts" value={myStats.goals} />
          <MiniStat label="Passes déc." value={myStats.assists} />
          <MiniStat label="Présences" value={`${myStats.matchesPlayed}/${teamStats.played}`} />
        </div>
      </Link>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-lg font-bold text-navy">{value}</p>
      <p className="text-xs text-navy/50">{label}</p>
    </div>
  );
}
