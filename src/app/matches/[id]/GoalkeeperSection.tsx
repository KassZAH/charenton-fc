import { getActivePlayers } from "@/lib/data/players";
import { getMatchRoster, getMatchGoalkeepers } from "@/lib/data/roster";
import { setMatchGoalkeepers } from "@/lib/data/goalkeepers-actions";

/**
 * Désignation du/des gardien(s) réels pour ce match (roadmap V3, Lot 13) —
 * uniquement parmi les joueurs déjà sur la feuille de match, plusieurs
 * gardiens possibles (mi-temps, remplacement).
 */
export async function GoalkeeperSection({ matchId }: { matchId: string }) {
  const rosterIds = await getMatchRoster(matchId);
  if (rosterIds.length === 0) return null;

  const [players, goalkeeperIds] = await Promise.all([getActivePlayers(), getMatchGoalkeepers(matchId)]);
  const rosterSet = new Set(rosterIds);
  const goalkeeperSet = new Set(goalkeeperIds);
  const rosterPlayers = players.filter((p) => rosterSet.has(p.id));

  return (
    <section className="mt-6 border-t border-white/10 pt-6">
      <h2 className="mb-1 text-sm font-bold text-cream">Gardien de but</h2>
      <p className="mb-3 text-xs text-steel/70">Parmi les joueurs de la feuille de match — plusieurs possibles.</p>
      <form action={setMatchGoalkeepers.bind(null, matchId)} className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {rosterPlayers.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy-card px-2 py-1.5 text-sm text-cream"
            >
              <input type="checkbox" name="goalkeeper_player_id" value={p.id} defaultChecked={goalkeeperSet.has(p.id)} />
              🧤 {p.nickname || p.first_name}
            </label>
          ))}
        </div>
        <button type="submit" className="w-full rounded-lg border border-white/15 bg-white/5 py-2 text-sm font-bold text-cream/80">
          Enregistrer le(s) gardien(s)
        </button>
      </form>
    </section>
  );
}
