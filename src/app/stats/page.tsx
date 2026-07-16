import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getTopScorers, getTopAssists, getTopPresences, getTeamStats, type PlayerCount } from "@/lib/data/stats";
import { getAwardLeaderboards } from "@/lib/data/awards";

export default async function StatsPage() {
  await requireUser();
  const [scorers, assists, presences, team, awardLeaderboards] = await Promise.all([
    getTopScorers(),
    getTopAssists(),
    getTopPresences(),
    getTeamStats(),
    getAwardLeaderboards(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-navy">Stats</h1>

      <section className="mb-6 rounded-2xl border border-navy/10 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy/60">Équipe</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Joués" value={team.played} />
          <Stat label="Gagnés" value={team.wins} />
          <Stat label="Nuls" value={team.draws} />
          <Stat label="Perdus" value={team.losses} />
        </div>
        <p className="mt-3 text-sm text-navy/70">
          {team.goalsFor} buts marqués · {team.goalsAgainst} encaissés
        </p>
      </section>

      <StatList title="Buteurs" rows={scorers} />
      <StatList title="Passeurs" rows={assists} />
      <StatList title="Présences" rows={presences} />

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
