import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getMyAvailability, getMatchAvailabilitySummary } from "@/lib/data/availability";
import { updateMatchResult } from "@/lib/data/matches-actions";
import { formatMatchDate, formatTime } from "@/lib/format";
import { AVAILABILITY_LABELS, MATCH_TYPE_LABELS } from "@/lib/labels";
import type { AvailabilityStatus } from "@/types/models";
import { AvailabilityButtons } from "./AvailabilityButtons";
import { GoalsSection } from "./GoalsSection";
import { AwardsSection } from "./AwardsSection";

const GROUP_ORDER: (AvailabilityStatus | "none")[] = ["present", "unsure", "absent", "injured", "none"];

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
        {user.role === "admin" && (
          <Link
            href={`/matches/${match.id}/edit`}
            className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/70"
          >
            Modifier
          </Link>
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
        <p className="mt-4 text-3xl font-bold text-navy">
          {match.team_score} – {match.opponent_score}
        </p>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-navy">Ta présence</h2>
          <AvailabilityButtons matchId={match.id} initialStatus={myStatus} />
        </section>
      )}

      {match.status === "completed" && (
        <>
          <GoalsSection matchId={match.id} isAdmin={user.role === "admin"} />
          <AwardsSection matchId={match.id} myPlayerId={user.playerId} />
        </>
      )}

      {user.role === "admin" && (
        <AdminSection
          matchId={match.id}
          isCompleted={match.status === "completed"}
          teamScore={match.team_score}
          opponentScore={match.opponent_score}
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
}: {
  matchId: string;
  isCompleted: boolean;
  teamScore: number | null;
  opponentScore: number | null;
}) {
  const summary = await getMatchAvailabilitySummary(matchId);

  const grouped: Record<AvailabilityStatus | "none", typeof summary> = {
    present: [],
    unsure: [],
    absent: [],
    injured: [],
    none: [],
  };
  for (const item of summary) {
    grouped[item.status ?? "none"].push(item);
  }

  return (
    <section className="mt-8 border-t border-navy/10 pt-6">
      <h2 className="mb-3 text-sm font-semibold text-navy">Réponses de l&apos;équipe</h2>
      <div className="space-y-3">
        {GROUP_ORDER.map((key) => (
          <div key={key}>
            <p className="text-xs font-semibold uppercase text-navy/50">
              {key === "none" ? "Pas encore répondu" : AVAILABILITY_LABELS[key]} ({grouped[key].length})
            </p>
            <p className="text-sm text-navy">
              {grouped[key].map((g) => g.player.nickname || g.player.first_name).join(", ") || "—"}
            </p>
          </div>
        ))}
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
