import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getNextMatch } from "@/lib/data/matches";
import { getMyAvailability } from "@/lib/data/availability";
import { formatMatchDate, formatTime } from "@/lib/format";
import { AVAILABILITY_LABELS } from "@/lib/labels";

export default async function HomePage() {
  const user = await requireUser();
  const nextMatch = await getNextMatch();
  const myStatus = nextMatch ? await getMyAvailability(nextMatch.id, user.playerId) : null;

  const isHome = nextMatch?.home_or_away === "home";
  const opponentLabel = nextMatch?.opponent_name ?? "Adversaire à confirmer";

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-lg font-bold text-navy">Salut {user.name}</h1>
      <p className="mb-6 text-sm text-navy/60">Bienvenue sur l&apos;espace Charenton FC.</p>

      {nextMatch ? (
        <Link
          href={`/matches/${nextMatch.id}`}
          className="block rounded-2xl border border-navy/10 bg-white p-4 shadow-sm active:scale-[0.99] transition"
        >
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

          <p className="mt-3 text-sm font-semibold text-navy">
            {myStatus ? `Ta réponse : ${AVAILABILITY_LABELS[myStatus]}` : "Réponds à la convocation →"}
          </p>
        </Link>
      ) : (
        <p className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-navy/60">
          Aucun match à venir pour le moment.
        </p>
      )}
    </div>
  );
}
