import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import {
  getTopScorers,
  getTopAssists,
  getTopPresences,
  getMostCarded,
  getTeamStats,
  getTeamHighlights,
  type PlayerCount,
} from "@/lib/data/stats";
import { getAwardLeaderboards } from "@/lib/data/awards";

const STREAK_LABELS: Record<"wins" | "draws" | "losses", string> = {
  wins: "victoire(s)",
  draws: "nul(s)",
  losses: "défaite(s)",
};

export default async function StatsPage() {
  await requireUser();
  const [scorers, assists, presences, carded, team, highlights, awardLeaderboards] = await Promise.all([
    getTopScorers(),
    getTopAssists(),
    getTopPresences(),
    getMostCarded(),
    getTeamStats(),
    getTeamHighlights(),
    getAwardLeaderboards(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy">Stats</h1>
        <div className="flex gap-2 text-xs font-medium">
          <Link href="/records" className="rounded-full border border-navy/20 px-3 py-1 text-navy/70">
            Records
          </Link>
          <Link href="/team/compare" className="rounded-full border border-navy/20 px-3 py-1 text-navy/70">
            Comparer
          </Link>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-navy/10 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy/60">Équipe</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Joués" value={team.played} />
          <Stat label="Gagnés" value={team.wins} />
          <Stat label="Nuls" value={team.draws} />
          <Stat label="Perdus" value={team.losses} />
        </div>
        <table className="mt-4 w-full border-t border-navy/10 text-sm">
          <tbody>
            <TeamStatRow label="Buts marqués" value={team.goalsFor} />
            <TeamStatRow label="Buts encaissés" value={team.goalsAgainst} />
            <TeamStatRow label="Diff. de buts" value={team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff} />
            <TeamStatRow label="Cartons jaunes" value={team.yellowCards} />
            <TeamStatRow label="Cartons rouges" value={team.redCards} last />
          </tbody>
        </table>

        {highlights.currentStreak && (
          <p className="mt-1 text-sm text-navy/70">
            Série en cours : {highlights.currentStreak.count} {STREAK_LABELS[highlights.currentStreak.type]}
          </p>
        )}
        {highlights.bestWinStreak > 1 && (
          <p className="text-sm text-navy/70">Meilleure série de victoires : {highlights.bestWinStreak}</p>
        )}
        {highlights.biggestWin && (
          <p className="mt-1 text-sm text-navy/70">
            Plus grosse victoire : {highlights.biggestWin.teamScore}–{highlights.biggestWin.opponentScore} vs{" "}
            {highlights.biggestWin.opponentName}
          </p>
        )}
        {highlights.biggestLoss && (
          <p className="text-sm text-navy/70">
            Plus grosse défaite : {highlights.biggestLoss.teamScore}–{highlights.biggestLoss.opponentScore} vs{" "}
            {highlights.biggestLoss.opponentName}
          </p>
        )}
      </section>

      <StatList title="Buteurs" rows={scorers} />
      <StatList title="Passeurs" rows={assists} />
      <StatList title="Présences" rows={presences} />
      <StatList title="Cartons" rows={carded} />

      {awardLeaderboards.map(({ award, leaders }) => (
        <StatList key={award.id} title={`${award.emoji ?? ""} ${award.name}`.trim()} rows={leaders} />
      ))}
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

function TeamStatRow({ label, value, last = false }: { label: string; value: number | string; last?: boolean }) {
  return (
    <tr className={last ? "" : "border-b border-navy/5"}>
      <td className="py-1.5 text-navy/60">{label}</td>
      <td className="py-1.5 text-right font-semibold tabular-nums text-navy">{value}</td>
    </tr>
  );
}

function StatList({ title, rows }: { title: string; rows: PlayerCount[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-navy/60">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-navy/50">Aucune donnée pour le moment.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row, i) => (
            <li key={row.playerId}>
              <Link
                href={`/team/${row.playerId}`}
                className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3 py-2"
              >
                <span className="text-sm text-navy">
                  <span className="mr-2 text-navy/40">{i + 1}.</span>
                  {row.name}
                </span>
                <span className="text-sm font-bold text-navy">{row.count}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
