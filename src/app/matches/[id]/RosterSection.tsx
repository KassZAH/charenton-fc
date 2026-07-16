import { getActivePlayers } from "@/lib/data/players";
import { getMatchAvailabilitySummary } from "@/lib/data/availability";
import { getMatchRoster } from "@/lib/data/roster";
import { confirmMatchRoster } from "@/lib/data/roster-actions";

export async function RosterSection({ matchId }: { matchId: string }) {
  const [players, availability, rosterIds] = await Promise.all([
    getActivePlayers(),
    getMatchAvailabilitySummary(matchId),
    getMatchRoster(matchId),
  ]);

  const availabilityByPlayerId = new Map(availability.map((a) => [a.player.id, a.status]));
  const hasRoster = rosterIds.length > 0;
  const rosterSet = new Set(rosterIds);

  return (
    <section className="mt-8 border-t border-navy/10 pt-6">
      <h2 className="mb-1 text-sm font-semibold text-navy">Feuille de match</h2>
      <p className="mb-3 text-xs text-navy/50">
        Qui a vraiment joué — sert de base aux stats de présence et aux records.
      </p>
      <form action={confirmMatchRoster.bind(null, matchId)} className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {players.map((p) => {
            const checked = hasRoster ? rosterSet.has(p.id) : availabilityByPlayerId.get(p.id) === "present";
            return (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-navy/10 bg-white px-2 py-1.5 text-sm text-navy"
              >
                <input type="checkbox" name="player_id" value={p.id} defaultChecked={checked} />
                {p.nickname || p.first_name}
              </label>
            );
          })}
        </div>
        <button type="submit" className="w-full rounded-lg bg-navy py-2 text-sm font-semibold text-gold">
          Enregistrer la feuille de match
        </button>
      </form>
    </section>
  );
}
