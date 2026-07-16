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
import { buildConvocationMessage, buildReminderMessage, buildResultMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { isElevatedRole, type AvailabilityStatus } from "@/types/models";
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

  const myStatus = await getMyAvailability(match.id, user.playerId);
  const isHome = match.home_or_away === "home";
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold">
          {(match.match_type && MATCH_TYPE_LABELS[match.match_type]) || "Match"}
        </p>
        {isElevatedRole(user.role) && (
          <div className="flex gap-2">
            <Link
              href={`/matches/${match.id}/lineup`}
              className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/70"
            >
              Feuille tactique
            </Link>
            <Link
              href={`/matches/${match.id}/edit`}
              className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/70"
            >
              Modifier
            </Link>
          </div>
        )}
      </div>
      <h1 className="mt-1 text-xl font-bold text-navy">
        {isHome ? "Charenton FC" : opponentLabel} vs {isHome ? opponentLabel : "Charenton FC"}
      </h1>
      <p className="mt-2 text-sm text-navy/70">{formatMatchDate(match.match_date)}</p>
      {match.kickoff_time && (
        <p className="text-sm text-navy/70">Coup d&apos;envoi : {formatTime(match.kickoff_time)}</p>
      )}
      {match.location && <p className="text-sm text-navy/70">{match.location}</p>}

      {match.status === "completed" ? (
        <>
          <p className="mt-4 text-3xl font-bold text-navy">
            {match.team_score} – {match.opponent_score}
          </p>
          {match.description && (
            <p className="mt-3 rounded-xl border border-navy/10 bg-white p-3 text-sm italic text-navy/70">
              {match.description}
            </p>
          )}
        </>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-navy">Ta présence</h2>
          <AvailabilityButtons matchId={match.id} initialStatus={myStatus} />
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
  isCompleted: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  opponentLabel: string;
  isHome: boolean;
  dateLabel: string;
  timeLabel: string | null;
  location: string | null;
}) {
  const summary = await getMatchAvailabilitySummary(matchId);

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
    <section className="mt-8 border-t border-navy/10 pt-6">
      <h2 className="mb-3 text-sm font-semibold text-navy">Réponses de l&apos;équipe</h2>
      <div className="space-y-4">
        {GROUP_ORDER.map((key) => (
          <div key={key}>
            <p className="mb-1.5 text-xs font-semibold uppercase text-navy/50">
              {key === "none" ? "Pas encore répondu" : AVAILABILITY_LABELS[key]} ({grouped[key].length})
            </p>
            {grouped[key].length === 0 ? (
              <p className="text-sm text-navy/40">—</p>
            ) : (
              <div className="space-y-1.5">
                {grouped[key].map((g) => (
                  <AdminAvailabilityRow
                    key={g.player.id}
                    matchId={matchId}
                    playerId={g.player.id}
                    playerName={nameOf(g)}
                    initialStatus={g.status}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={whatsappShareUrl(convocationText)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy/70"
        >
          Partager la convocation
        </a>
        {reminderText && (
          <a
            href={whatsappShareUrl(reminderText)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy/70"
          >
            Relancer les sans-réponse
          </a>
        )}
        {resultText && (
          <a
            href={whatsappShareUrl(resultText)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy/70"
          >
            Partager le résultat
          </a>
        )}
      </div>

      <form action={updateMatchResult.bind(null, matchId)} className="mt-6 flex items-end gap-3">
        <label className="flex-1 text-sm text-navy">
          Score Charenton
          <input
            type="number"
            name="team_score"
            required
            min={0}
            defaultValue={teamScore ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </label>
        <label className="flex-1 text-sm text-navy">
          Score adverse
          <input
            type="number"
            name="opponent_score"
            required
            min={0}
            defaultValue={opponentScore ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-gold">
          {isCompleted ? "Corriger" : "Valider"}
        </button>
      </form>
    </section>
  );
}
