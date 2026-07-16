import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getActiveSeason } from "@/lib/data/seasons";
import { getSeasonTeamRecord } from "@/lib/data/season-recap";
import { getRecords, type RecordHolder } from "@/lib/data/records";
import { buildSeasonRecapMessage, whatsappShareUrl } from "@/lib/whatsapp";

export default async function SeasonRecapPage() {
  await requireUser();
  const season = await getActiveSeason();
  const [team, records] = await Promise.all([
    getSeasonTeamRecord(season?.id ?? null),
    getRecords(season?.id ?? null),
  ]);

  const shareText = buildSeasonRecapMessage({
    seasonName: season?.name ?? "Historique",
    played: team.played,
    wins: team.wins,
    draws: team.draws,
    losses: team.losses,
    goalsFor: team.goalsFor,
    goalsAgainst: team.goalsAgainst,
    topScorer: records.topScorer,
    topAssist: records.topAssist,
    mostMatches: records.mostMatches,
    biggestWin: records.biggestWin
      ? {
          teamScore: records.biggestWin.teamScore,
          opponentScore: records.biggestWin.opponentScore,
          opponentName: records.biggestWin.opponentName,
        }
      : null,
  });

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">Bilan de saison</p>
      <h1 className="mb-4 text-lg font-bold text-navy">{season?.name ?? "Historique"}</h1>

      {team.played === 0 ? (
        <p className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-navy/60">
          Pas encore de match joué cette saison.
        </p>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-navy/10 bg-white p-4">
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
                <TeamStatRow
                  label="Diff. de buts"
                  value={team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                />
                <TeamStatRow label="Cartons jaunes" value={team.yellowCards} />
                <TeamStatRow label="Cartons rouges" value={team.redCards} last />
              </tbody>
            </table>
          </section>

          <div className="mb-6 space-y-2">
            <RecordRow label="Meilleur buteur" holder={records.topScorer} suffix="buts" />
            <RecordRow label="Meilleur passeur" holder={records.topAssist} suffix="passes déc." />
            <RecordRow label="Plus assidu" holder={records.mostMatches} suffix="matchs" />
            <RecordRow label="Plus de cartons" holder={records.mostCards} suffix="cartons" />
            {records.biggestWin && (
              <div className="rounded-xl border border-navy/10 bg-white p-3">
                <p className="text-xs font-semibold uppercase text-navy/50">Plus grosse victoire</p>
                <p className="text-sm font-semibold text-navy">
                  {records.biggestWin.teamScore}–{records.biggestWin.opponentScore} vs{" "}
                  {records.biggestWin.opponentName}
                </p>
                <p className="text-xs text-navy/50">{records.biggestWin.dateLabel}</p>
              </div>
            )}
          </div>

          <a
            href={whatsappShareUrl(shareText)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl bg-navy px-4 py-3 text-center text-sm font-semibold text-gold"
          >
            Partager le bilan
          </a>
        </>
      )}
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

function RecordRow({ label, holder, suffix }: { label: string; holder: RecordHolder | null; suffix: string }) {
  if (!holder) return null;
  return (
    <Link
      href={`/team/${holder.playerId}`}
      className="flex items-center justify-between rounded-xl border border-navy/10 bg-white p-3"
    >
      <div>
        <p className="text-xs font-semibold uppercase text-navy/50">{label}</p>
        <p className="text-sm font-semibold text-navy">{holder.name}</p>
      </div>
      <span className="text-lg font-bold text-navy">
        {holder.value} <span className="text-xs font-normal text-navy/50">{suffix}</span>
      </span>
    </Link>
  );
}
