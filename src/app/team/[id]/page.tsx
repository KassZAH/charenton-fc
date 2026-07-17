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
import { getPlayerMeasurements } from "@/lib/data/measurements";
import { getPlayerBadges } from "@/lib/data/badges";
import { getTeamRecordWithWithoutPlayer } from "@/lib/data/stats-advanced";
import { getVisiblePlayerGoals } from "@/lib/data/player-goals";
import { getActiveInjury } from "@/lib/data/injuries";
import { canView } from "@/lib/visibility";
import { formatMatchDate, formatShortDate, formatShortDateOnly } from "@/lib/format";
import { isElevatedRole } from "@/types/models";
import { PlayerCardButton } from "./PlayerCardButton";
import { CareerCardButton } from "./CareerCardButton";

function initials(firstName: string, lastName: string | null) {
  return (firstName[0] + (lastName?.[0] ?? "")).toUpperCase();
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const player = await getPlayerById(id);
  if (!player) notFound();

  const [stats, advanced, awardWins, history, badges, withWithout, goals, activeInjury] = await Promise.all([
    getPlayerStats(player.id),
    getPlayerAdvancedStats(player.id),
    getPlayerAwardWins(player.id),
    getPlayerMatchHistory(player.id),
    getPlayerBadges(player.id),
    getTeamRecordWithWithoutPlayer(player.id),
    getVisiblePlayerGoals(player.id, { playerId: user.playerId, role: user.role }),
    getActiveInjury(player.id),
  ]);

  const viewer = { playerId: user.playerId, role: user.role };
  const canSeeMeasurements = canView(player.measurements_visibility as "private" | "coach" | "team" | "public", player.id, viewer);
  const canSeeBirthday = canView(player.birthday_visibility as "private" | "coach" | "team" | "public", player.id, viewer);
  const canSeePhoto = canView(player.photo_visibility as "private" | "coach" | "team" | "public", player.id, viewer);
  const measurements = canSeeMeasurements ? await getPlayerMeasurements(player.id) : [];
  const trophyCount = awardWins.reduce((sum, w) => sum + w.wins, 0);
  const latestMeasurement = measurements[0] ?? null;
  const earliestWeight = [...measurements].reverse().find((m) => m.weight_kg != null)?.weight_kg ?? null;
  const weightEvolution =
    latestMeasurement?.weight_kg != null && earliestWeight != null && earliestWeight !== latestMeasurement.weight_kg
      ? Math.round((latestMeasurement.weight_kg - earliestWeight) * 10) / 10
      : null;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        {canSeePhoto && player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo_url}
            alt={player.nickname || player.first_name}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold text-xl font-extrabold text-navy-deep">
            {initials(player.first_name, player.last_name)}
          </span>
        )}
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-cream">
            {player.nickname || player.first_name}
            {player.shirt_number != null && (
              <span className="text-sm font-normal text-steel/70">#{player.shirt_number}</span>
            )}
            {player.role === "admin" && (
              <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-deep">
                Admin
              </span>
            )}
            {player.role === "coach" && (
              <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                Coach
              </span>
            )}
          </h1>
          <p className="text-sm text-steel/70">
            {[player.primary_position, player.status === "archived" ? "Archivé" : null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <PlayerCardButton
            player={{
              name: player.nickname || player.first_name,
              shirtNumber: player.shirt_number,
              position: player.primary_position,
              goals: stats.goals,
              assists: stats.assists,
              matchesPlayed: stats.matchesPlayed,
              badgeCount: badges.length,
            }}
          />
          <CareerCardButton
            player={{
              name: player.nickname || player.first_name,
              shirtNumber: player.shirt_number,
              position: player.primary_position,
              goals: stats.goals,
              assists: stats.assists,
              matchesPlayed: stats.matchesPlayed,
              trophyCount,
              badgeCount: badges.length,
            }}
          />
          {isElevatedRole(user.role) && (
            <Link
              href={`/team/${player.id}/edit`}
              className="text-xs font-medium text-steel/70 underline underline-offset-2"
            >
              Modifier
            </Link>
          )}
        </div>
      </div>

      {player.quote && (
        <p className="mb-6 rounded-xl border border-white/10 bg-navy-card p-3 text-sm italic text-cream/80">
          « {player.quote} »
        </p>
      )}

      {canSeeBirthday && player.birthday && (
        <p className="mb-6 text-sm text-steel/70">🎂 {formatShortDateOnly(player.birthday)}</p>
      )}

      {activeInjury && (
        <div className="mb-6 rounded-xl border border-white/10 bg-navy-card p-3 text-sm text-cream/80">
          🩹 Blessé
          {activeInjury.estimated_return_date && ` — retour estimé ${formatShortDateOnly(activeInjury.estimated_return_date)}`}
          {activeInjury.comment &&
            canView(activeInjury.comment_visibility as "private" | "coach" | "team", player.id, viewer) && (
              <p className="mt-1 italic text-steel/70">{activeInjury.comment}</p>
            )}
        </div>
      )}

      {latestMeasurement && (latestMeasurement.weight_kg != null || latestMeasurement.height_cm != null) && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3 text-sm text-cream">
          <span>
            {latestMeasurement.weight_kg != null && `${latestMeasurement.weight_kg} kg`}
            {latestMeasurement.height_cm != null && ` · ${latestMeasurement.height_cm} cm`}
            {weightEvolution != null && (
              <span className={weightEvolution > 0 ? "text-red-400" : "text-emerald-400"}>
                {" "}
                ({weightEvolution > 0 ? "+" : ""}
                {weightEvolution} depuis le début)
              </span>
            )}
          </span>
          <span className="text-xs text-steel/70">{formatShortDate(latestMeasurement.recorded_at)}</span>
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-white/10 bg-navy-card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Présences" value={stats.matchesPlayed} />
          <Stat label="Buts" value={stats.goals} />
          <Stat label="Passes déc." value={stats.assists} />
        </div>
        {(stats.yellowCards > 0 || stats.redCards > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-center">
            <Stat label="Jaunes" value={stats.yellowCards} />
            <Stat label="Rouges" value={stats.redCards} />
          </div>
        )}
      </section>

      {stats.matchesPlayed > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">En détail</h2>
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

      {withWithout && (withWithout.withPlayer.played > 0 || withWithout.withoutPlayer.played > 0) && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">
            Bilan de l&apos;équipe avec / sans {player.nickname || player.first_name}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-navy-card p-3 text-center">
              <p className="text-xs font-semibold uppercase text-steel/70">Avec</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gold">
                {withWithout.withPlayer.wins}-{withWithout.withPlayer.draws}-{withWithout.withPlayer.losses}
              </p>
              <p className="text-[10px] text-steel/60">{withWithout.withPlayer.played} match(s)</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-navy-card p-3 text-center">
              <p className="text-xs font-semibold uppercase text-steel/70">Sans</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gold">
                {withWithout.withoutPlayer.wins}-{withWithout.withoutPlayer.draws}-{withWithout.withoutPlayer.losses}
              </p>
              <p className="text-[10px] text-steel/60">{withWithout.withoutPlayer.played} match(s)</p>
            </div>
          </div>
          {!withWithout.sufficientSample && (
            <p className="mt-2 text-xs text-steel/60">Données indicatives, échantillon limité.</p>
          )}
        </section>
      )}

      {goals.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Objectifs personnels</h2>
          <ul className="space-y-1.5">
            {goals.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
              >
                <div>
                  <p className={`text-sm ${g.achieved ? "text-steel/60 line-through" : "text-cream"}`}>{g.title}</p>
                  {g.target_date && (
                    <p className="text-[10px] text-steel/60">Objectif : {formatShortDateOnly(g.target_date)}</p>
                  )}
                </div>
                {g.achieved && <span className="text-sm text-gold">✅</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Récompenses</h2>
        {awardWins.length === 0 ? (
          <p className="text-sm text-steel/70">Aucune récompense pour le moment.</p>
        ) : (
          <ul className="space-y-1.5">
            {awardWins.map(({ award, wins }) => (
              <li
                key={award.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
              >
                <span className="text-sm text-cream">
                  {award.emoji} {award.name}
                </span>
                <span className="text-sm font-bold text-gold">×{wins}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {badges.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Badges</h2>
          <ul className="space-y-1.5">
            {badges.map((b) => (
              <li
                key={b.badgeKey}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
              >
                <span className="text-sm text-cream">{b.label}</span>
                <span className="text-xs text-steel/70">{formatShortDate(b.earnedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Matchs joués</h2>
        {history.length === 0 ? (
          <p className="text-sm text-steel/70">Aucun match joué pour le moment.</p>
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
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-cream">
                        {isHome ? "vs" : "@"} {opponentLabel}
                      </p>
                      <p className="text-xs text-steel">{formatMatchDate(match.match_date)}</p>
                      {contributions && <p className="text-xs text-gold">{contributions}</p>}
                    </div>
                    {match.status === "completed" && (
                      <span className="text-sm font-bold tabular-nums text-gold">
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
      <p className="text-2xl font-extrabold tabular-nums text-gold">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2">
      <span className="text-sm text-cream/80">{label}</span>
      <span className="text-sm font-bold text-cream">{value}</span>
    </li>
  );
}
