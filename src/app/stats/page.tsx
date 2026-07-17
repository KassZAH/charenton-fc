import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import {
  getTopScorers,
  getTopAssists,
  getTopGoalContributions,
  getTopPresences,
  getMostCarded,
  getTeamStats,
  getTeamHighlights,
} from "@/lib/data/stats";
import { getAwardLeaderboards } from "@/lib/data/awards";
import { isElevatedRole } from "@/types/models";
import { StatSelector, type StatCategory } from "./StatSelector";

const STREAK_LABELS: Record<"wins" | "draws" | "losses", string> = {
  wins: "victoire(s)",
  draws: "nul(s)",
  losses: "défaite(s)",
};

export default async function StatsPage() {
  const user = await requireUser();
  const [scorers, assists, contributions, presences, carded, team, highlights, awardLeaderboards] = await Promise.all([
    getTopScorers(),
    getTopAssists(),
    getTopGoalContributions(),
    getTopPresences(),
    getMostCarded(),
    getTeamStats(),
    getTeamHighlights(),
    getAwardLeaderboards(),
  ]);

  const categories: StatCategory[] = [
    { key: "scorers", title: "Buteurs", rows: scorers },
    { key: "assists", title: "Passeurs", rows: assists },
    { key: "contributions", title: "Buts + passes déc.", rows: contributions },
    { key: "presences", title: "Présences", rows: presences },
    { key: "carded", title: "Cartons", rows: carded },
    ...awardLeaderboards.map(({ award, leaders }) => ({
      key: award.id,
      title: `${award.emoji ?? ""} ${award.name}`.trim(),
      rows: leaders,
    })),
  ];

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Stats</h1>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
        <Link href="/records" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          Records
        </Link>
        <Link href="/stats/tendances" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          Tendances
        </Link>
        <Link href="/season-recap" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          Bilan
        </Link>
        <Link href="/team/compare" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          Comparer
        </Link>
        <Link href="/memoire" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          Mémoire
        </Link>
        <Link href="/trophees" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          Trophées
        </Link>
        {isElevatedRole(user.role) && (
          <Link href="/history" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
            Historique
          </Link>
        )}
      </div>

      <section className="mb-6 rounded-2xl border border-gold/15 bg-navy-mid p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-steel">Équipe</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Joués" value={team.played} />
          <Stat label="Gagnés" value={team.wins} />
          <Stat label="Nuls" value={team.draws} />
          <Stat label="Perdus" value={team.losses} />
        </div>
        <table className="mt-4 w-full border-t border-white/10 text-sm">
          <tbody>
            <TeamStatRow label="Buts marqués" value={team.goalsFor} />
            <TeamStatRow label="Buts encaissés" value={team.goalsAgainst} />
            <TeamStatRow label="Diff. de buts" value={team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff} />
            <TeamStatRow label="Cartons jaunes" value={team.yellowCards} />
            <TeamStatRow label="Cartons rouges" value={team.redCards} last />
          </tbody>
        </table>

        {highlights.currentStreak && (
          <p className="mt-1 text-sm text-cream/80">
            Série en cours : {highlights.currentStreak.count} {STREAK_LABELS[highlights.currentStreak.type]}
          </p>
        )}
        {highlights.bestWinStreak > 1 && (
          <p className="text-sm text-cream/80">Meilleure série de victoires : {highlights.bestWinStreak}</p>
        )}
        {highlights.biggestWin && (
          <p className="mt-1 text-sm text-cream/80">
            Plus grosse victoire : {highlights.biggestWin.teamScore}–{highlights.biggestWin.opponentScore} vs{" "}
            {highlights.biggestWin.opponentName}
          </p>
        )}
        {highlights.biggestLoss && (
          <p className="text-sm text-cream/80">
            Plus grosse défaite : {highlights.biggestLoss.teamScore}–{highlights.biggestLoss.opponentScore} vs{" "}
            {highlights.biggestLoss.opponentName}
          </p>
        )}
      </section>

      <StatSelector categories={categories} />
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

function TeamStatRow({ label, value, last = false }: { label: string; value: number | string; last?: boolean }) {
  return (
    <tr className={last ? "" : "border-b border-white/8"}>
      <td className="py-1.5 text-steel">{label}</td>
      <td className="py-1.5 text-right font-semibold tabular-nums text-cream">{value}</td>
    </tr>
  );
}
