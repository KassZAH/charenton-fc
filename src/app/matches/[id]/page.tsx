import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getMyAvailability, getMatchAvailabilitySummary } from "@/lib/data/availability";
import { updateMatchResult } from "@/lib/data/matches-actions";
import { getMatchGoals } from "@/lib/data/goals";
import { getMatchAwardResults } from "@/lib/data/awards";
import { formatMatchDate, formatTime } from "@/lib/format";
import { AVAILABILITY_LABELS, MATCH_TYPE_LABELS } from "@/lib/labels";
import { buildConvocationMessage, buildReminderMessage, buildResultMessage } from "@/lib/whatsapp";
import { getActiveInjury, getActiveInjuriesByPlayerId, injuryReturnLabelForDate } from "@/lib/data/injuries";
import { isElevatedRole, type AvailabilityStatus } from "@/types/models";
import { WhatsAppShareButton } from "@/components/ui/WhatsAppShareButton";
import { AvailabilityButtons } from "./AvailabilityButtons";
import { GoalsSection } from "./GoalsSection";
import { CardsSection } from "./CardsSection";
import { AwardsSection } from "./AwardsSection";
import { AdminAvailabilityRow } from "./AdminAvailabilityRow";
import { RosterSection } from "./RosterSection";

const GROUP_ORDER: (AvailabilityStatus | "none")[] = ["present", "uncertain", "absent", "injured", "none"];

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const match = await getMatchById(id);
  if (!match) notFound();

  const [myStatus, activeInjury] = await Promise.all([
    getMyAvailability(match.id, user.playerId),
    getActiveInjury(user.playerId),
  ]);
  const isHome = match.home_or_away === "home";
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";
  const activeInjuryReturnDateLabel = injuryReturnLabelForDate(activeInjury, match.match_date);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
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
      <p className="mt-2 text-sm text-steel">{formatMatchDate(match.match_date)}</p>
      {match.kickoff_time && (
        <p className="text-sm text-steel">Coup d&apos;envoi : {formatTime(match.kickoff_time)}</p>
      )}
      {match.location && <p className="text-sm text-steel">{match.location}</p>}
      {match.status !== "completed" && (
        <a
          href={`/matches/${match.id}/calendar`}
          className="mt-1 inline-block text-xs font-medium text-steel/70 underline underline-offset-2"
        >
          Ajouter à mon calendrier
        </a>
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

      {match.status === "completed" && (
        <>
          {isElevatedRole(user.role) && <RosterSection matchId={match.id} />}
          <GoalsSection matchId={match.id} isAdmin={isElevatedRole(user.role)} />
          <CardsSection matchId={match.id} isAdmin={isElevatedRole(user.role)} />
          <AwardsSection matchId={match.id} myPlayerId={user.playerId} />
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
          location={match.location}
        />
      )}
    </div>
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
  location,
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
  location: string | null;
}) {
  const [summary, activeInjuriesByPlayerId] = await Promise.all([
    getMatchAvailabilitySummary(matchId),
    getActiveInjuriesByPlayerId(),
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
    location,
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
      scorers: goals
        .filter((g) => g.scorer_player_id || g.is_unknown_scorer)
        .map((g) => g.scorer_name ?? "Buteur inconnu"),
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
