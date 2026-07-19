import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getMyAvailability, getMatchAvailabilitySummary } from "@/lib/data/availability";
import { updateMatchResult, setCaptain } from "@/lib/data/matches-actions";
import { getMatchGoals } from "@/lib/data/goals";
import { getMatchAwardResults } from "@/lib/data/awards";
import { getTeamHighlights } from "@/lib/data/stats";
import { getActivePlayers, getPlayerById } from "@/lib/data/players";
import { getMatchCarpoolSummary, getMyCarpoolInfo } from "@/lib/data/carpool";
import { getMatchReadiness } from "@/lib/data/match-readiness";
import { getMatchCompleteness } from "@/lib/data/match-completeness";
import { buildItineraryUrl } from "@/lib/maps";
import { formatMatchDate, formatTime } from "@/lib/format";
import { AVAILABILITY_LABELS, MATCH_TYPE_LABELS } from "@/lib/labels";
import { buildConvocationMessage, buildReminderMessage, buildResultMessage } from "@/lib/whatsapp";
import { getActiveInjury, getActiveInjuriesByPlayerId, injuryReturnLabelForDate } from "@/lib/data/injuries";
import { isElevatedRole, type AvailabilityStatus } from "@/types/models";
import { WhatsAppShareButton } from "@/components/ui/WhatsAppShareButton";
import { PlayerSelect } from "@/components/ui/PlayerSelect";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";
import { OpponentStandingSummary } from "@/components/fla/OpponentStandingSummary";
import { buildOpponentStandingLookup } from "@/lib/data/opponent-standings-lookup";
import { getExternalCompetition, getExternalStandings } from "@/lib/data/external-standings";
import { getOpponentMappings } from "@/lib/data/opponent-mappings";
import { FLA_CONFIG } from "@/lib/fla/config";
import { AvailabilityButtons } from "./AvailabilityButtons";
import { GoalsSection } from "./GoalsSection";
import { CardsSection } from "./CardsSection";
import { AwardsSection } from "./AwardsSection";
import { AdminAvailabilityRow } from "./AdminAvailabilityRow";
import { RosterSection } from "./RosterSection";
import { CarpoolSection } from "./CarpoolSection";
import { EquipmentSection } from "./EquipmentSection";
import { DuplicateMatchForm } from "./DuplicateMatchForm";
import { MatchPosterButton } from "./MatchPosterButton";
import { ResultCardButton } from "./ResultCardButton";
import { ReinforcementSection } from "./ReinforcementSection";

const GROUP_ORDER: (AvailabilityStatus | "none")[] = ["present", "uncertain", "absent", "injured", "none"];

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const match = await getMatchById(id);
  if (!match) notFound();

  const isUpcoming = match.status !== "completed";

  const headerList = await headers();
  const host = headerList.get("host");
  const origin = `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;

  const [myStatus, activeInjury, captain, carpoolSummary, myCarpoolInfo] = await Promise.all([
    getMyAvailability(match.id, user.playerId),
    getActiveInjury(user.playerId),
    match.captain_player_id ? getPlayerById(match.captain_player_id) : Promise.resolve(null),
    isUpcoming ? getMatchCarpoolSummary(match.id) : Promise.resolve(null),
    isUpcoming ? getMyCarpoolInfo(match.id, user.playerId) : Promise.resolve(null),
  ]);
  const isHome = match.home_or_away === "home";
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";

  const flaCompetition = await getExternalCompetition(FLA_CONFIG.provider, FLA_CONFIG.externalChampionshipId, FLA_CONFIG.externalSeasonId);
  const [flaStandings, flaMappings] = flaCompetition
    ? await Promise.all([getExternalStandings(flaCompetition.id), getOpponentMappings(flaCompetition.id)])
    : [[], []];
  const opponentStandingResult = match.opponent_name ? buildOpponentStandingLookup(flaMappings, flaStandings)(match.opponent_name) : null;

  const activeInjuryReturnDateLabel = injuryReturnLabelForDate(activeInjury, match.match_date);
  const captainName = captain ? captain.nickname || captain.first_name : null;
  const matchLabel = `${isHome ? "Charenton FC" : opponentLabel} vs ${isHome ? opponentLabel : "Charenton FC"}`;
  const itineraryUrl = buildItineraryUrl(match.address, match.maps_url);

  let resultCardData: {
    scorers: string[];
    assists: string[];
    awards: { emoji: string | null; name: string; winner: string }[];
    streakLabel: string | null;
  } | null = null;
  if (match.status === "completed") {
    const [goals, awardResults, highlights] = await Promise.all([
      getMatchGoals(match.id),
      getMatchAwardResults(match.id),
      getTeamHighlights(),
    ]);
    const streakLabels = { wins: "victoire(s) de suite", draws: "match(s) nul(s) de suite", losses: "défaite(s) de suite" };
    resultCardData = {
      scorers: goals.filter((g) => g.credited_to === "charenton").map((g) => g.scorer_name ?? "Buteur inconnu"),
      assists: goals.filter((g) => g.assist_name).map((g) => g.assist_name!),
      awards: awardResults
        .filter((r) => r.winners.length > 0)
        .map((r) => ({ emoji: r.award.emoji, name: r.award.name, winner: r.winners.map((w) => w.name).join(" / ") })),
      streakLabel: highlights.currentStreak
        ? `${highlights.currentStreak.count} ${streakLabels[highlights.currentStreak.type]}`
        : null,
    };
  }

  return (
    <ResponsivePageContainer size="wide">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          {(match.match_type && MATCH_TYPE_LABELS[match.match_type]) || "Match"}
        </p>
        {isElevatedRole(user.role) && (
          <div className="flex gap-2">
            <Link
              href={`/matches/${match.id}/lineup`}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-cream/80"
            >
              Feuille tactique
            </Link>
            <Link
              href={`/matches/${match.id}/edit`}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-cream/80"
            >
              Modifier
            </Link>
          </div>
        )}
      </div>
      <h1 className="text-scoreboard mt-1 text-xl font-extrabold text-cream">
        {isHome ? "Charenton FC" : opponentLabel} vs {isHome ? opponentLabel : "Charenton FC"}
      </h1>
      {opponentStandingResult && (
        <p className="mt-0.5">
          <OpponentStandingSummary result={opponentStandingResult} isOwner={user.isOwner} emptyFallback="coming-soon" />
        </p>
      )}
      <p className="mt-2 text-sm text-steel">{formatMatchDate(match.match_date)}</p>
      {match.meeting_time && (
        <p className="text-sm text-steel">🕒 RDV : {formatTime(match.meeting_time)}</p>
      )}
      {match.kickoff_time && (
        <p className="text-sm text-steel">Coup d&apos;envoi : {formatTime(match.kickoff_time)}</p>
      )}
      {match.location && <p className="text-sm text-steel">{match.location}</p>}
      {captainName && <p className="text-sm text-steel">🧢 Capitaine : {captainName}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {match.status !== "completed" && (
          <a
            href={`/matches/${match.id}/calendar`}
            className="inline-block text-xs font-medium text-steel/70 underline underline-offset-2"
          >
            Ajouter à mon calendrier
          </a>
        )}
        {itineraryUrl && (
          <a
            href={itineraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-steel/70 underline underline-offset-2"
          >
            Itinéraire
          </a>
        )}
      </div>

      {isUpcoming && (
        <div className="mt-3">
          <MatchPosterButton
            data={{ isHome, opponentLabel, dateLabel: formatMatchDate(match.match_date), timeLabel: formatTime(match.kickoff_time), location: match.location }}
          />
        </div>
      )}

      {match.status === "completed" ? (
        <>
          <p className="mt-4 text-4xl font-extrabold tabular-nums text-gold">
            {match.team_score} – {match.opponent_score}
          </p>
          {match.description && (
            <p className="mt-3 rounded-xl border border-white/10 bg-navy-card p-3 text-sm italic text-cream/80">
              {match.description}
            </p>
          )}
          {resultCardData && (
            <div className="mt-3">
              <ResultCardButton
                data={{
                  isHome,
                  opponentLabel,
                  teamScore: match.team_score ?? 0,
                  opponentScore: match.opponent_score ?? 0,
                  ...resultCardData,
                }}
              />
            </div>
          )}
          {isElevatedRole(user.role) && match.opponent_id && (
            <div className="mt-4">
              <DuplicateMatchForm matchId={match.id} opponentLabel={opponentLabel} />
            </div>
          )}
        </>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-cream">Ta présence</h2>
          <AvailabilityButtons
            matchId={match.id}
            initialStatus={myStatus}
            activeInjuryReturnDateLabel={activeInjuryReturnDateLabel}
          />
        </section>
      )}

      {isUpcoming && carpoolSummary && (
        <CarpoolSection matchId={match.id} myInfo={myCarpoolInfo} summary={carpoolSummary} />
      )}

      {isUpcoming && <EquipmentSection matchId={match.id} isAdmin={isElevatedRole(user.role)} />}

      {isUpcoming && isElevatedRole(user.role) && (
        <ReinforcementSection matchId={match.id} origin={origin} matchLabel={matchLabel} />
      )}

      {match.status === "completed" && (
        <>
          {isElevatedRole(user.role) && <RosterSection matchId={match.id} />}
          <GoalsSection matchId={match.id} isAdmin={isElevatedRole(user.role)} />
          <CardsSection matchId={match.id} isAdmin={isElevatedRole(user.role)} />
          <AwardsSection matchId={match.id} myPlayerId={user.playerId} isAdmin={isElevatedRole(user.role)} />
        </>
      )}

      {isElevatedRole(user.role) && (
        <AdminSection
          matchId={match.id}
          matchDate={match.match_date}
          isCompleted={match.status === "completed"}
          teamScore={match.team_score}
          opponentScore={match.opponent_score}
          opponentLabel={opponentLabel}
          isHome={isHome}
          dateLabel={formatMatchDate(match.match_date)}
          timeLabel={formatTime(match.kickoff_time)}
          meetingTimeLabel={formatTime(match.meeting_time)}
          location={match.location}
          captainPlayerId={match.captain_player_id}
          captainName={captainName}
        />
      )}
    </ResponsivePageContainer>
  );
}

async function AdminSection({
  matchId,
  matchDate,
  isCompleted,
  teamScore,
  opponentScore,
  opponentLabel,
  isHome,
  dateLabel,
  timeLabel,
  meetingTimeLabel,
  location,
  captainPlayerId,
  captainName,
}: {
  matchId: string;
  matchDate: string;
  isCompleted: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  opponentLabel: string;
  isHome: boolean;
  dateLabel: string;
  timeLabel: string | null;
  meetingTimeLabel: string | null;
  location: string | null;
  captainPlayerId: string | null;
  captainName: string | null;
}) {
  const [summary, activeInjuriesByPlayerId, players, readiness, completeness] = await Promise.all([
    getMatchAvailabilitySummary(matchId),
    getActiveInjuriesByPlayerId(),
    getActivePlayers(),
    isCompleted ? Promise.resolve(null) : getMatchReadiness(matchId),
    isCompleted ? getMatchCompleteness(matchId, teamScore) : Promise.resolve(null),
  ]);

  const grouped: Record<AvailabilityStatus | "none", typeof summary> = {
    present: [],
    uncertain: [],
    absent: [],
    injured: [],
    none: [],
  };
  for (const item of summary) {
    grouped[item.status ?? "none"].push(item);
  }

  const nameOf = (g: (typeof summary)[number]) => g.player.nickname || g.player.first_name;
  const convocationText = buildConvocationMessage({
    opponentLabel,
    isHome,
    dateLabel,
    timeLabel,
    meetingTimeLabel,
    location,
    captainName,
    present: grouped.present.map(nameOf),
    uncertain: grouped.uncertain.map(nameOf),
    absent: [...grouped.absent, ...grouped.injured].map(nameOf),
    noResponse: grouped.none.map(nameOf),
  });
  const reminderText =
    grouped.none.length > 0
      ? buildReminderMessage({
          matchLabel: `${isHome ? "vs" : "@"} ${opponentLabel} (${dateLabel})`,
          names: grouped.none.map(nameOf),
        })
      : null;

  let resultText: string | null = null;
  if (isCompleted) {
    const [goals, awardResults] = await Promise.all([getMatchGoals(matchId), getMatchAwardResults(matchId)]);
    resultText = buildResultMessage({
      opponentLabel,
      isHome,
      teamScore,
      opponentScore,
      scorers: goals.filter((g) => g.credited_to === "charenton").map((g) => g.scorer_name ?? "Buteur inconnu"),
      assists: goals.filter((g) => g.assist_name).map((g) => g.assist_name!),
      awards: awardResults
        .filter((r) => r.winners.length > 0)
        .map((r) => ({
          emoji: r.award.emoji,
          name: r.award.name,
          winner: r.winners.map((w) => w.name).join(" / "),
        })),
    });
  }

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Réponses de l&apos;équipe</h2>
      <div className="space-y-4">
        {GROUP_ORDER.map((key) => (
          <div key={key}>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-steel/70">
              {key === "none" ? "Pas encore répondu" : AVAILABILITY_LABELS[key]} ({grouped[key].length})
            </p>
            {grouped[key].length === 0 ? (
              <p className="text-sm text-steel/50">—</p>
            ) : (
              <div className="space-y-1.5">
                {grouped[key].map((g) => (
                  <AdminAvailabilityRow
                    key={g.player.id}
                    matchId={matchId}
                    playerId={g.player.id}
                    playerName={nameOf(g)}
                    initialStatus={g.status}
                    activeInjuryReturnDateLabel={injuryReturnLabelForDate(
                      activeInjuriesByPlayerId.get(g.player.id),
                      matchDate
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form action={setCaptain.bind(null, matchId)} className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-cream/80" htmlFor="captain_player_id">
            Capitaine
          </label>
          <PlayerSelect
            id="captain_player_id"
            name="captain_player_id"
            players={players.map((p) => ({ id: p.id, name: p.nickname || p.first_name }))}
            defaultValue={captainPlayerId ?? ""}
            placeholder="— Aucun —"
            className="mt-1"
          />
        </div>
        <button type="submit" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-cream/80">
          {captainName ? "Changer" : "Définir"}
        </button>
      </form>

      {readiness && (
        <div className="mt-4 rounded-xl border border-white/10 bg-navy-card p-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-steel/70">État de préparation</p>
          {readiness.warnings.length === 0 && readiness.awaitingResponses ? (
            <p className="text-sm text-steel/70">⏳ En attente des réponses des joueurs.</p>
          ) : readiness.warnings.length === 0 ? (
            <p className="text-sm text-emerald-400">✅ Tout est prêt.</p>
          ) : (
            <ul className="space-y-1">
              {readiness.warnings.map((w) => (
                <li key={w} className="text-sm text-gold">
                  ⚠️ {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {completeness && (
        <div className="mt-4 rounded-xl border border-white/10 bg-navy-card p-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-steel/70">
            Match complété à {completeness.percent} %
          </p>
          <ul className="space-y-1">
            {completeness.items.map((item) => (
              <li
                key={item.label}
                className={`text-sm ${
                  item.status === "ok" ? "text-emerald-400" : item.status === "warning" ? "text-gold" : "text-steel"
                }`}
              >
                {item.status === "ok" ? "✅" : item.status === "warning" ? "⚠️" : "❌"} {item.label}
                {item.detail ? ` (${item.detail})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <WhatsAppShareButton text={convocationText}>Partager la convocation</WhatsAppShareButton>
        {reminderText && (
          <WhatsAppShareButton text={reminderText}>Relancer les sans-réponse</WhatsAppShareButton>
        )}
        {resultText && <WhatsAppShareButton text={resultText}>Partager le résultat</WhatsAppShareButton>}
      </div>

      <form action={updateMatchResult.bind(null, matchId)} className="mt-6 flex items-end gap-3">
        <label className="flex-1 text-sm text-cream">
          Score Charenton
          <input
            type="number"
            inputMode="numeric"
            name="team_score"
            required
            min={0}
            defaultValue={teamScore ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </label>
        <label className="flex-1 text-sm text-cream">
          Score adverse
          <input
            type="number"
            inputMode="numeric"
            name="opponent_score"
            required
            min={0}
            defaultValue={opponentScore ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </label>
        <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
          {isCompleted ? "Corriger" : "Valider"}
        </button>
      </form>
    </section>
  );
}
