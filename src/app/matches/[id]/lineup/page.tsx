import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getMatchAvailabilitySummary } from "@/lib/data/availability";
import { getMatchLineup } from "@/lib/data/lineup";
import { formatMatchDate } from "@/lib/format";
import { LineupBoard } from "./LineupBoard";

export default async function LineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const match = await getMatchById(id);
  if (!match) notFound();

  const [summary, lineup] = await Promise.all([getMatchAvailabilitySummary(match.id), getMatchLineup(match.id)]);

  const presentPlayers = summary
    .filter((s) => s.status === "present")
    .map((s) => ({ id: s.player.id, name: s.player.nickname || s.player.first_name }));

  const isHome = match.home_or_away === "home";
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-lg font-bold text-navy">Feuille tactique</h1>
      <p className="mb-6 text-sm text-navy/60">
        {isHome ? "vs" : "@"} {opponentLabel} · {formatMatchDate(match.match_date)}
      </p>

      {presentPlayers.length === 0 ? (
        <p className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-navy/60">
          Aucun joueur n&apos;a encore répondu « Présent » pour ce match — reviens une fois qu&apos;il y a des
          réponses.
        </p>
      ) : (
        <LineupBoard
          matchId={match.id}
          players={presentPlayers}
          initialFormation={lineup?.formation ?? "4-4-2"}
          initialPositions={lineup?.positions ?? {}}
        />
      )}
    </div>
  );
}
