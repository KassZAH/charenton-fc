import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getPlayerById } from "@/lib/data/players";
import {
  getPlayerStats,
  getPlayerAdvancedStats,
  getPlayerAwardWins,
  getPlayerMatchHistory,
} from "@/lib/data/player-stats";
import { formatMatchDate } from "@/lib/format";

function initials(firstName: string, lastName: string | null) {
  return (firstName[0] + (lastName?.[0] ?? "")).toUpperCase();
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const player = await getPlayerById(id);
  if (!player) notFound();

  const [stats, advanced, awardWins, history] = await Promise.all([
    getPlayerStats(player.id),
    getPlayerAdvancedStats(player.id),
    getPlayerAwardWins(player.id),
    getPlayerMatchHistory(player.id),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-bold text-gold">
          {initials(player.first_name, player.last_name)}
        </span>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-navy">
            {player.nickname || player.first_name}
            {player.shirt_number != null && (
              <span className="ml-2 text-sm font-normal text-navy/50">#{player.shirt_number}</span>
            )}
          </h1>
          <p className="text-sm text-navy/50">
            {[
              player.primary_position,
              player.role === "admin" ? "Admin" : null,
              player.status === "archived" ? "Archivé" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
        {user.role === "admin" && (
          <Link
            href={`/team/${player.id}/edit`}
            className="rounded-full border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy/70"
          >
            Modifier
          </Link>
        )}
      </div>

      {player.quote && (
        <p className="mb-6 rounded-xl border border-navy/10 bg-white p-3 text-sm italic text-navy/70">
          « {player.quote} »
        </p>
      )}

      <section className="mb-6 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Présences" value={stats.matchesPlayed} />
          <Stat label="Buts" value={stats.goals} />
          <Stat label="Passes déc." value={stats.assists} />
        </div>
        {(stats.yellowCards > 0 || stats.redCards > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-navy/10 pt-3 text-center">
            <Stat label="Jaunes" value={stats.yellowCards} />
            <Stat label="Rouges" value={stats.redCards} />
          </div>
        )}
      </section>

      {stats.matchesPlayed > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-navy/60">En détail</h2>
          <ul className="space-y-1.5">
            <DetailRow label="Taux de présence" value={`${advanced.presenceRate}%`} />
            <DetailRow label="Taux de victoire (présent)" value={`${advanced.winRateWhenPresent}%`} />
            <DetailRow label="Buts par match" value={advanced.goalsPerMatch.toString()} />
            <DetailRow label="Passes déc. par match" value={advanced.assistsPerMatch.toString()} />
            {advanced.braces > 0 && <DetailRow label="Doublés" value={advanced.braces.toString()} />}
            {advanced.hatTricks > 0 && <DetailRow label="Triplés ou plus" value={advanced.hatTricks.toString()} />}
            {advanced.goalAndAssistMatches > 0 && (
              <DetailRow label="But + passe déc. même match" value={advanced.goalAndAssistMatches.toString()} />
            )}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-navy/60">Récompenses</h2>
        {awardWins.length === 0 ? (
          <p className="text-sm text-navy/50">Aucune récompense pour le moment.</p>
        ) : (
          <ul className="space-y-1.5">
            {awardWins.map(({ award, wins }) => (
              <li
                key={award.id}
                className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3 py-2"
              >
                <span className="text-sm text-navy">
                  {award.emoji} {award.name}
                </span>
                <span className="text-sm font-bold text-navy">×{wins}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-navy/60">Matchs joués</h2>
        {history.length === 0 ? (
          <p className="text-sm text-navy/50">Aucun match joué pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {history.map(({ match, goals, assists }) => {
              const isHome = match.home_or_away === "home";
              const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";
              const contributions = [
                goals > 0 ? `${goals} but${goals > 1 ? "s" : ""}` : null,
                assists > 0 ? `${assists} passe${assists > 1 ? "s" : ""} déc.` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={match.id}>
                  <Link
                    href={`/matches/${match.id}`}
                    className="flex items-center justify-between rounded-xl border border-navy/10 bg-white p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {isHome ? "vs" : "@"} {opponentLabel}
                      </p>
                      <p className="text-xs text-navy/60">{formatMatchDate(match.match_date)}</p>
                      {contributions && <p className="text-xs text-gold">{contributions}</p>}
                    </div>
                    {match.status === "completed" && (
                      <span className="text-sm font-bold text-navy">
                        {match.team_score}–{match.opponent_score}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold text-navy">{value}</p>
      <p className="text-xs text-navy/50">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3 py-2">
      <span className="text-sm text-navy/70">{label}</span>
      <span className="text-sm font-bold text-navy">{value}</span>
    </li>
  );
}
