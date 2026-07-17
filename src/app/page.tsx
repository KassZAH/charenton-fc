import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getNextMatch } from "@/lib/data/matches";
import { getMyAvailability, getMatchAvailabilitySummary } from "@/lib/data/availability";
import { getPlayerStats } from "@/lib/data/player-stats";
import { getTeamStats } from "@/lib/data/stats";
import { formatMatchDate, formatTime } from "@/lib/format";
import { getFunnyLine } from "@/lib/funny-lines";
import { buildReminderMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { isElevatedRole } from "@/types/models";
import { AvailabilityButtons } from "./matches/[id]/AvailabilityButtons";

function shortDateBadge(dateLabel: string) {
  // "Ven. 25 juillet" -> "25/07" pour le fanion, sinon on affiche tel quel.
  const match = /(\d{1,2})\s+(\p{L}+)/u.exec(dateLabel);
  const months: Record<string, string> = {
    janvier: "01",
    février: "02",
    mars: "03",
    avril: "04",
    mai: "05",
    juin: "06",
    juillet: "07",
    août: "08",
    septembre: "09",
    octobre: "10",
    novembre: "11",
    décembre: "12",
  };
  if (!match) return dateLabel;
  const day = match[1].padStart(2, "0");
  const month = months[match[2].toLowerCase()];
  return month ? `${day}/${month}` : dateLabel;
}

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
  const dateLabel = nextMatch ? formatMatchDate(nextMatch.match_date) : "";

  let noResponseNames: string[] = [];
  if (nextMatch && isElevatedRole(user.role)) {
    const summary = await getMatchAvailabilitySummary(nextMatch.id);
    noResponseNames = summary
      .filter((s) => s.status === null)
      .map((s) => s.player.nickname || s.player.first_name);
  }

  const funnyLine = getFunnyLine({
    goals: myStats.goals,
    assists: myStats.assists,
    matchesPlayed: myStats.matchesPlayed,
    yellowCards: myStats.yellowCards,
    redCards: myStats.redCards,
    teamMatchesPlayed: teamStats.played,
  });

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">Salut {user.name}</p>
      <h1 className="text-scoreboard mb-6 text-2xl font-extrabold text-cream">Bienvenue sur l&apos;espace</h1>

      {nextMatch ? (
        <div className="relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-br from-navy-card to-navy-mid p-4 pt-5 shadow-lg shadow-black/30 before:absolute before:-top-16 before:-right-16 before:h-40 before:w-40 before:rounded-full before:bg-gold/20 before:blur-2xl">
          <div className="corner-pennant">
            <span>{shortDateBadge(dateLabel)}</span>
          </div>
          <Link href={`/matches/${nextMatch.id}`} className="relative block active:opacity-80 transition">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">Prochain match</p>
            <p className="text-scoreboard text-lg font-extrabold text-cream">
              {isHome ? "Charenton FC" : opponentLabel} vs {isHome ? opponentLabel : "Charenton FC"}
            </p>
            <p className="mt-1 text-sm text-steel">
              {dateLabel}
              {nextMatch.kickoff_time ? ` · ${formatTime(nextMatch.kickoff_time)}` : ""}
            </p>
            {nextMatch.location && <p className="text-sm text-steel">{nextMatch.location}</p>}
          </Link>

          <div className="divider-dashed relative my-4" />

          <div className="relative">
            <p className="mb-2 text-sm font-bold text-cream">Ta présence</p>
            <AvailabilityButtons matchId={nextMatch.id} initialStatus={myStatus} />
          </div>

          {noResponseNames.length > 0 && (
            <div className="relative mt-4 flex items-center justify-between gap-2 rounded-xl bg-gold/10 px-3 py-2">
              <p className="text-xs text-cream/80">
                {noResponseNames.length} joueur{noResponseNames.length > 1 ? "s" : ""} sans réponse pour ce match.
              </p>
              <a
                href={whatsappShareUrl(
                  buildReminderMessage({
                    matchLabel: `${isHome ? "vs" : "@"} ${opponentLabel} (${dateLabel})`,
                    names: noResponseNames,
                  })
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-gold/40 bg-navy-deep/40 px-3 py-1 text-xs font-bold text-gold"
              >
                Relancer
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-navy-card p-4 text-sm text-steel">
          Aucun match à venir pour le moment.
        </p>
      )}

      <Link
        href={`/team/${user.playerId}`}
        className="mt-4 block rounded-2xl border border-white/10 bg-navy-card p-4 shadow-lg shadow-black/20 active:scale-[0.99] transition"
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gold">Ta saison</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Buts" value={myStats.goals} />
          <MiniStat label="Passes déc." value={myStats.assists} />
          <MiniStat label="Présences" value={`${myStats.matchesPlayed}/${teamStats.played}`} />
        </div>
        <p className="mt-3 border-t border-white/10 pt-3 text-sm italic text-steel">{funnyLine}</p>
      </Link>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums text-gold">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">{label}</p>
    </div>
  );
}
