import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getNextMatch } from "@/lib/data/matches";
import { getMyAvailability, getMatchAvailabilitySummary } from "@/lib/data/availability";
import { getPlayerStats } from "@/lib/data/player-stats";
import { getTeamStats } from "@/lib/data/stats";
import { getPlayerById } from "@/lib/data/players";
import { getMatchReadiness } from "@/lib/data/match-readiness";
import { formatMatchDate, formatShortDateOnly, formatTime } from "@/lib/format";
import { getFunnyLine } from "@/lib/funny-lines";
import { buildReminderMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { buildItineraryUrl } from "@/lib/maps";
import { todayDateString, currentTimeString } from "@/lib/clock";
import { getActiveInjury, injuryReturnLabelForDate } from "@/lib/data/injuries";
import { recoverFromInjury } from "@/lib/data/injuries-actions";
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
  const isAdmin = isElevatedRole(user.role);
  const [nextMatch, myStats, teamStats, activeInjury] = await Promise.all([
    getNextMatch(),
    getPlayerStats(user.playerId),
    getTeamStats(),
    getActiveInjury(user.playerId),
  ]);
  const myStatus = nextMatch ? await getMyAvailability(nextMatch.id, user.playerId) : null;

  const isHome = nextMatch?.home_or_away === "home";
  const opponentLabel = nextMatch?.opponent_name ?? "Adversaire à confirmer";
  const dateLabel = nextMatch ? formatMatchDate(nextMatch.match_date) : "";

  const isMatchToday = !!nextMatch && nextMatch.match_date === todayDateString();
  const hasKickedOff = isMatchToday && !!nextMatch!.kickoff_time && currentTimeString() >= nextMatch!.kickoff_time!;

  const activeInjuryReturnDateLabel = nextMatch
    ? injuryReturnLabelForDate(activeInjury, nextMatch.match_date)
    : null;

  let noResponseNames: string[] = [];
  let presentCount: number | null = null;
  if (nextMatch && (isAdmin || isMatchToday)) {
    const summary = await getMatchAvailabilitySummary(nextMatch.id);
    if (isAdmin) {
      noResponseNames = summary.filter((s) => s.status === null).map((s) => s.player.nickname || s.player.first_name);
    }
    if (isMatchToday) {
      presentCount = summary.filter((s) => s.status === "present").length;
    }
  }

  let captainName: string | null = null;
  if (isMatchToday && nextMatch?.captain_player_id) {
    const captain = await getPlayerById(nextMatch.captain_player_id);
    captainName = captain ? captain.nickname || captain.first_name : null;
  }

  const itineraryUrl =
    isMatchToday && nextMatch ? buildItineraryUrl(nextMatch.address, nextMatch.maps_url) : null;

  const readiness =
    isMatchToday && isAdmin && !hasKickedOff && nextMatch ? await getMatchReadiness(nextMatch.id) : null;

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
      <h1 className="text-scoreboard mb-4 text-2xl font-extrabold text-cream">Bienvenue sur l&apos;espace</h1>

      {activeInjury ? (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-navy-card px-3 py-2">
          <p className="text-xs text-cream/80">
            🩹 Blessé
            {activeInjury.estimated_return_date
              ? ` — retour estimé ${formatShortDateOnly(activeInjury.estimated_return_date)}`
              : ""}
          </p>
          <form action={recoverFromInjury}>
            <button
              type="submit"
              className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs font-bold text-gold"
            >
              Je suis rétabli
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/profile"
          className="mb-4 inline-block text-xs font-medium text-steel underline underline-offset-2"
        >
          🩹 Je suis blessé ?
        </Link>
      )}

      {nextMatch ? (
        <div className="relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-br from-navy-card to-navy-mid p-4 pt-5 shadow-lg shadow-black/30 before:absolute before:-top-16 before:-right-16 before:h-40 before:w-40 before:rounded-full before:bg-gold/20 before:blur-2xl">
          <div className="corner-pennant">
            <span>{shortDateBadge(dateLabel)}</span>
          </div>
          <Link href={`/matches/${nextMatch.id}`} className="relative block active:opacity-80 transition">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">
              {hasKickedOff ? "Match en cours" : isMatchToday ? "Match aujourd'hui" : "Prochain match"}
            </p>
            <p className="text-scoreboard text-lg font-extrabold text-cream">
              {isHome ? "Charenton FC" : opponentLabel} vs {isHome ? opponentLabel : "Charenton FC"}
            </p>
            <p className="mt-1 text-sm text-steel">
              {dateLabel}
              {nextMatch.kickoff_time ? ` · ${formatTime(nextMatch.kickoff_time)}` : ""}
            </p>
            {nextMatch.location && <p className="text-sm text-steel">{nextMatch.location}</p>}
          </Link>

          {isMatchToday && (
            <div className="relative mt-3 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-navy-deep/40 p-3 text-xs text-cream/90">
              {nextMatch.meeting_time && <p>🕒 RDV : {formatTime(nextMatch.meeting_time)}</p>}
              {presentCount != null && <p>👥 {presentCount} présent{presentCount > 1 ? "s" : ""}</p>}
              {captainName && <p>🧢 Capitaine : {captainName}</p>}
            </div>
          )}

          {isMatchToday && (
            <div className="relative mt-3 flex flex-wrap gap-2">
              {itineraryUrl && (
                <a
                  href={itineraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-cream/80"
                >
                  Itinéraire
                </a>
              )}
              <a
                href={`/matches/${nextMatch.id}#covoiturage`}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-cream/80"
              >
                Covoiturage
              </a>
              {isAdmin && (
                <Link
                  href={`/matches/${nextMatch.id}/lineup`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-cream/80"
                >
                  Composition
                </Link>
              )}
            </div>
          )}

          <div className="divider-dashed relative my-4" />

          {hasKickedOff ? (
            <Link
              href={`/matches/${nextMatch.id}`}
              className="relative block rounded-xl bg-gold px-4 py-3 text-center text-sm font-bold text-navy-deep"
            >
              {isAdmin ? "Saisir le résultat" : "Voir la feuille de match"}
            </Link>
          ) : (
            <div className="relative">
              <p className="mb-2 text-sm font-bold text-cream">Ta présence</p>
              <AvailabilityButtons
                matchId={nextMatch.id}
                initialStatus={myStatus}
                activeInjuryReturnDateLabel={activeInjuryReturnDateLabel}
              />
            </div>
          )}

          {!hasKickedOff && noResponseNames.length > 0 && (
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

          {readiness && readiness.warnings.length > 0 && (
            <div className="relative mt-4 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2">
              {readiness.warnings.map((w) => (
                <p key={w} className="text-xs text-gold">
                  ⚠️ {w}
                </p>
              ))}
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
