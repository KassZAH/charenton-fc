import { requireUser } from "@/lib/auth/current-user";
import { getActivePlayers, getPlayerById } from "@/lib/data/players";
import { getPlayerStats, getPlayerAdvancedStats } from "@/lib/data/player-stats";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  await requireUser();
  const { a, b } = await searchParams;
  const players = await getActivePlayers();

  const [playerA, playerB] = await Promise.all([
    a ? getPlayerById(a) : Promise.resolve(null),
    b ? getPlayerById(b) : Promise.resolve(null),
  ]);

  const [statsA, advA, statsB, advB] = await Promise.all([
    playerA ? getPlayerStats(playerA.id) : Promise.resolve(null),
    playerA ? getPlayerAdvancedStats(playerA.id) : Promise.resolve(null),
    playerB ? getPlayerStats(playerB.id) : Promise.resolve(null),
    playerB ? getPlayerAdvancedStats(playerB.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-extrabold text-cream">Comparer deux joueurs</h1>

      <form method="get" className="mb-6 grid grid-cols-2 gap-3">
        <select
          name="a"
          defaultValue={a ?? ""}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        >
          <option value="">— Joueur A —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.first_name}
            </option>
          ))}
        </select>
        <select
          name="b"
          defaultValue={b ?? ""}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        >
          <option value="">— Joueur B —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.first_name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="col-span-2 rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep"
        >
          Comparer
        </button>
      </form>

      {playerA && playerB && statsA && statsB && advA && advB ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide text-steel/70">
            <span>{playerA.nickname || playerA.first_name}</span>
            <span>{playerB.nickname || playerB.first_name}</span>
          </div>
          <CompareRow label="Présences" a={statsA.matchesPlayed} b={statsB.matchesPlayed} />
          <CompareRow label="Buts" a={statsA.goals} b={statsB.goals} />
          <CompareRow label="Passes déc." a={statsA.assists} b={statsB.assists} />
          <CompareRow label="Buts par match" a={advA.goalsPerMatch} b={advB.goalsPerMatch} />
          <CompareRow label="Passes déc. par match" a={advA.assistsPerMatch} b={advB.assistsPerMatch} />
          <CompareRow label="Taux de présence" a={advA.presenceRate} b={advB.presenceRate} suffix="%" />
          <CompareRow
            label="Taux de victoire (présent)"
            a={advA.winRateWhenPresent}
            b={advB.winRateWhenPresent}
            suffix="%"
          />
          <CompareRow label="Doublés" a={advA.braces} b={advB.braces} />
          <CompareRow label="Triplés ou plus" a={advA.hatTricks} b={advB.hatTricks} />
          <CompareRow label="Cartons jaunes" a={statsA.yellowCards} b={statsB.yellowCards} />
          <CompareRow label="Cartons rouges" a={statsA.redCards} b={statsB.redCards} />
        </div>
      ) : (
        <p className="text-sm text-steel/70">Choisis deux joueurs à comparer.</p>
      )}
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
  suffix = "",
}: {
  label: string;
  a: number;
  b: number;
  suffix?: string;
}) {
  const aWins = a > b;
  const bWins = b > a;
  return (
    <div className="rounded-xl border border-white/10 bg-navy-card p-3">
      <p className="mb-1 text-center text-xs text-steel/70">{label}</p>
      <div className="flex items-center justify-between">
        <span className={`text-base font-bold ${aWins ? "text-gold" : "text-cream"}`}>
          {a}
          {suffix}
        </span>
        <span className={`text-base font-bold ${bWins ? "text-gold" : "text-cream"}`}>
          {b}
          {suffix}
        </span>
      </div>
    </div>
  );
}
