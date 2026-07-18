import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import {
  getRecentForm,
  getMatchBreakdowns,
  getUpcomingMilestones,
  getSeasonProjection,
  type RecordLine,
} from "@/lib/data/stats-advanced";
import { getActiveSeasonId } from "@/lib/data/seasons";

const RESULT_STYLES: Record<"W" | "D" | "L", string> = {
  W: "bg-emerald-400/15 text-emerald-300",
  D: "bg-white/10 text-steel",
  L: "bg-red-400/15 text-red-300",
};

const RESULT_LABELS: Record<"W" | "D" | "L", string> = { W: "V", D: "N", L: "D" };

export default async function TendancesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  await requireUser();
  const { scope } = await searchParams;
  const isAllTime = scope === "all";
  const activeSeasonId = await getActiveSeasonId();
  const seasonIdForBreakdowns = isAllTime ? null : activeSeasonId;

  const [form, breakdowns, milestones, projection] = await Promise.all([
    getRecentForm(5),
    getMatchBreakdowns(seasonIdForBreakdowns),
    getUpcomingMilestones(),
    isAllTime ? Promise.resolve(null) : getSeasonProjection(activeSeasonId),
  ]);

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Tendances</h1>
        <Link href="/stats" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Stats
        </Link>
      </div>

      <div className="mb-6 flex gap-2 text-xs font-medium">
        <Link
          href="/stats/tendances"
          className={`rounded-full px-3 py-1 ${!isAllTime ? "bg-gold text-navy-deep" : "border border-white/15 text-steel/80"}`}
        >
          Saison
        </Link>
        <Link
          href="/stats/tendances?scope=all"
          className={`rounded-full px-3 py-1 ${isAllTime ? "bg-gold text-navy-deep" : "border border-white/15 text-steel/80"}`}
        >
          Historique
        </Link>
      </div>

      {form.length > 0 && (
        <Section title="Forme (5 derniers matchs)">
          <div className="flex gap-2">
            {form.map((f, i) => (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${RESULT_STYLES[f.result]}`}
                title={`${f.opponentName} : ${f.teamScore}–${f.opponentScore}`}
              >
                {RESULT_LABELS[f.result]}
              </div>
            ))}
          </div>
        </Section>
      )}

      {projection && (
        <Section title="Projection de fin de saison">
          <p className="text-sm text-cream/90">
            Au rythme actuel (<GoldNum>{projection.winRatePercent}</GoldNum>% de victoires sur {projection.played}{" "}
            match{projection.played > 1 ? "s" : ""} joués) : environ <GoldNum>{projection.projectedWins}</GoldNum>{" "}
            victoires sur {projection.totalProjected} matchs cette saison.
          </p>
          <p className="mt-1 text-xs text-steel/60">Projection indicative, pas une prédiction.</p>
        </Section>
      )}

      {milestones.length > 0 && (
        <Section title="Records imminents">
          <ul className="space-y-1.5">
            {milestones.map((m) => (
              <li key={`${m.playerId}-${m.kind}`}>
                <Link
                  href={`/team/${m.playerId}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
                >
                  <span className="text-sm text-cream">
                    {m.name} est à <span className="font-bold text-gold">{m.remaining}</span>{" "}
                    {m.kind === "goals" ? "but" : "présence"}
                    {m.remaining > 1 ? "s" : ""} des {m.target}{" "}
                    {m.kind === "goals" ? "buts" : "présences"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Domicile / Extérieur">
        <div className="grid grid-cols-2 gap-2">
          <RecordCard label="Domicile" record={breakdowns.homeAway.home} />
          <RecordCard label="Extérieur" record={breakdowns.homeAway.away} />
        </div>
      </Section>

      {breakdowns.byWeekday.length > 0 && (
        <Section title="Bilan par jour">
          <ul className="space-y-1.5">
            {breakdowns.byWeekday.map((w) => (
              <RecordRow key={w.label} label={w.label} record={w.record} />
            ))}
          </ul>
        </Section>
      )}

      {breakdowns.byMonth.length > 0 && (
        <Section title="Bilan par mois">
          <ul className="space-y-1.5">
            {breakdowns.byMonth.map((m) => (
              <RecordRow
                key={m.label}
                label={m.label}
                record={m.record}
                highlight={breakdowns.bestMonth?.label === m.label}
              />
            ))}
          </ul>
          {breakdowns.bestMonth && (
            <p className="mt-2 text-xs text-steel/70">
              Meilleur mois : <span className="text-gold">{breakdowns.bestMonth.label}</span> (
              {breakdowns.bestMonth.record.wins} victoire{breakdowns.bestMonth.record.wins > 1 ? "s" : ""})
            </p>
          )}
        </Section>
      )}

      {breakdowns.byFormation.length > 0 && (
        <Section title="Bilan par formation">
          <ul className="space-y-1.5">
            {breakdowns.byFormation.map((f) => (
              <RecordRow key={f.formation} label={f.formation} record={f.record} />
            ))}
          </ul>
        </Section>
      )}

      <Section title="Buteurs différents">
        <p className="text-2xl font-extrabold tabular-nums text-gold">{breakdowns.distinctScorers}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-steel">
          joueur{breakdowns.distinctScorers > 1 ? "s" : ""} ayant marqué
        </p>
      </Section>

      {breakdowns.goalTypeBreakdown.length > 0 && (
        <Section title="Répartition des buts">
          <ul className="space-y-1.5">
            {breakdowns.goalTypeBreakdown.map((t) => (
              <li
                key={t.type}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
              >
                <span className="text-sm text-cream">{t.label}</span>
                <span className="text-sm font-bold tabular-nums text-gold">{t.count}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">{title}</h2>
      {children}
    </section>
  );
}

function GoldNum({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-gold tabular-nums">{children}</span>;
}

function RecordCard({ label, record }: { label: string; record: RecordLine }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-card p-3 text-center">
      <p className="text-xs font-semibold uppercase text-steel/70">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-gold">
        {record.wins}-{record.draws}-{record.losses}
      </p>
      <p className="text-[10px] text-steel/60">
        {record.played} match{record.played > 1 ? "s" : ""} · {record.goalsFor}–{record.goalsAgainst}
      </p>
    </div>
  );
}

function RecordRow({ label, record, highlight = false }: { label: string; record: RecordLine; highlight?: boolean }) {
  return (
    <li
      className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
        highlight ? "border-gold/30 bg-gold/5" : "border-white/10 bg-navy-card"
      }`}
    >
      <span className="text-sm capitalize text-cream">{label}</span>
      <span className="text-sm tabular-nums text-steel">
        {record.played} J · <span className="text-gold">{record.wins}</span>-{record.draws}-{record.losses}
      </span>
    </li>
  );
}
