import type { ExternalStanding } from "@/lib/fla/types";

/**
 * Tableau de classement FLA (roadmap V3, Lot 11.5, §10-11). Desktop :
 * tableau complet. Mobile : colonnes prioritaires (position, équipe,
 * points, joués, diff.) + détail (V/N/D/BM/BE) dans un <details> natif par
 * ligne — jamais dix colonnes écrasées dans 360px.
 */
export function StandingsTable({ standings, internalTeamName }: { standings: ExternalStanding[]; internalTeamName: string }) {
  const isOurTeam = (name: string) => name.trim().toLowerCase() === internalTeamName.trim().toLowerCase();

  return (
    <div>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-steel/70">
              <th className="py-2 pl-3 text-left">Pos.</th>
              <th className="py-2 text-left">Équipe</th>
              <th className="py-2 text-center">Pts</th>
              <th className="py-2 text-center">J</th>
              <th className="py-2 text-center">V</th>
              <th className="py-2 text-center">N</th>
              <th className="py-2 text-center">D</th>
              <th className="py-2 text-center">BM</th>
              <th className="py-2 text-center">BE</th>
              <th className="py-2 pr-3 text-center">Diff.</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr
                key={s.id}
                className={`border-b border-white/5 ${isOurTeam(s.team_name) ? "border-l-4 border-l-gold bg-gold/10" : ""}`}
              >
                <td className="py-2 pl-3 tabular-nums text-cream">{s.position ?? "—"}</td>
                <td className="py-2 font-medium text-cream">
                  {s.team_name}
                  {isOurTeam(s.team_name) && <span className="ml-2 text-xs font-bold text-gold">Notre équipe</span>}
                </td>
                <td className="py-2 text-center font-bold tabular-nums text-cream">{s.points ?? "—"}</td>
                <td className="py-2 text-center tabular-nums text-steel/80">{s.played ?? "—"}</td>
                <td className="py-2 text-center tabular-nums text-steel/80">{s.wins ?? "—"}</td>
                <td className="py-2 text-center tabular-nums text-steel/80">{s.draws ?? "—"}</td>
                <td className="py-2 text-center tabular-nums text-steel/80">{s.losses ?? "—"}</td>
                <td className="py-2 text-center tabular-nums text-steel/80">{s.goals_for ?? "—"}</td>
                <td className="py-2 text-center tabular-nums text-steel/80">{s.goals_against ?? "—"}</td>
                <td className="py-2 pr-3 text-center tabular-nums text-steel/80">
                  {s.goal_difference !== null ? (s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="space-y-1.5 md:hidden">
        {standings.map((s) => (
          <li
            key={s.id}
            className={`rounded-xl border p-2.5 ${
              isOurTeam(s.team_name) ? "border-gold/50 bg-gold/10" : "border-white/10 bg-navy-card"
            }`}
          >
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-cream">
                  <span className="tabular-nums text-steel/70">{s.position ?? "—"}</span>
                  {s.team_name}
                  {isOurTeam(s.team_name) && <span className="text-xs font-bold text-gold">Notre équipe</span>}
                </span>
                <span className="flex items-center gap-3 text-xs tabular-nums text-steel/80">
                  <span className="font-bold text-cream">{s.points ?? "—"} pts</span>
                  <span>{s.played ?? "—"} J</span>
                  <span>{s.goal_difference !== null ? (s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference) : "—"}</span>
                </span>
              </summary>
              <p className="mt-2 text-xs text-steel/80">
                {s.wins ?? "—"}V · {s.draws ?? "—"}N · {s.losses ?? "—"}D · BM {s.goals_for ?? "—"} · BE {s.goals_against ?? "—"}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
