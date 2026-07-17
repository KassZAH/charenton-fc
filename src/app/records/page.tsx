import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getRecords, type RecordHolder } from "@/lib/data/records";
import { getActiveSeasonId } from "@/lib/data/seasons";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  await requireUser();
  const { scope } = await searchParams;
  const isAllTime = scope === "all";

  const activeSeasonId = isAllTime ? null : await getActiveSeasonId();
  const records = await getRecords(isAllTime ? null : activeSeasonId);

  const hasData = Object.values(records).some((v) => v !== null);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Records</h1>
        <div className="flex gap-2 text-xs font-medium">
          <Link
            href="/records"
            className={`rounded-full px-3 py-1 ${
              !isAllTime ? "bg-gold text-navy-deep" : "border border-white/15 text-steel/80"
            }`}
          >
            Saison
          </Link>
          <Link
            href="/records?scope=all"
            className={`rounded-full px-3 py-1 ${
              isAllTime ? "bg-gold text-navy-deep" : "border border-white/15 text-steel/80"
            }`}
          >
            Historique
          </Link>
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-steel/70">Pas encore assez de données pour cette période.</p>
      ) : (
        <div className="space-y-2">
          <RecordRow label="Meilleur buteur" holder={records.topScorer} suffix="buts" />
          <RecordRow label="Meilleur passeur" holder={records.topAssist} suffix="passes déc." />
          <RecordRow label="Plus de matchs joués" holder={records.mostMatches} suffix="matchs" />
          <RecordRow label="Plus de doublés" holder={records.mostBraces} suffix="doublés" />
          <RecordRow label="Plus de cartons" holder={records.mostCards} suffix="cartons" />
          <RecordRow
            label="Plus longue série avec un but"
            holder={records.longestScoringStreak}
            suffix="matchs de suite"
          />
          <RecordRow
            label="Plus longue série avec une passe déc."
            holder={records.longestAssistStreak}
            suffix="matchs de suite"
          />
          <RecordRow
            label="Plus longue série de présence"
            holder={records.longestPresenceStreak}
            suffix="matchs de suite"
          />
          <RecordRow
            label="Plus longue série sans carton"
            holder={records.longestNoCardStreak}
            suffix="matchs de suite"
          />
          <RecordRow label="Meilleur taux de présence" holder={records.bestPresenceRate} suffix="%" />
          <RecordRow label="Plus de buts en un match" holder={records.mostGoalsInOneMatch} suffix="buts" />

          {records.biggestWin && (
            <div className="rounded-xl border border-white/10 bg-navy-card p-3">
              <p className="text-xs font-semibold uppercase text-steel/70">Plus grosse victoire</p>
              <p className="text-sm font-semibold text-cream">
                {records.biggestWin.teamScore}–{records.biggestWin.opponentScore} vs{" "}
                {records.biggestWin.opponentName}
              </p>
              <p className="text-xs text-steel/70">{records.biggestWin.dateLabel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecordRow({
  label,
  holder,
  suffix,
}: {
  label: string;
  holder: RecordHolder | null;
  suffix: string;
}) {
  if (!holder) return null;
  return (
    <Link
      href={`/team/${holder.playerId}`}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
    >
      <div>
        <p className="text-xs font-semibold uppercase text-steel/70">{label}</p>
        <p className="text-sm font-semibold text-cream">{holder.name}</p>
        {holder.detail && <p className="text-xs text-steel/70">{holder.detail}</p>}
      </div>
      <span className="text-lg font-bold tabular-nums text-gold">
        {holder.value} <span className="text-xs font-normal text-steel/70">{suffix}</span>
      </span>
    </Link>
  );
}
