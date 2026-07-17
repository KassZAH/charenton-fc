import Link from "next/link";
import { getMatchGoals } from "@/lib/data/goals";
import { addGoal, deleteGoal } from "@/lib/data/goals-actions";
import { getActivePlayers } from "@/lib/data/players";
import type { Player } from "@/types/models";

export async function GoalsSection({ matchId, isAdmin }: { matchId: string; isAdmin: boolean }) {
  const goals = await getMatchGoals(matchId);
  const players = isAdmin ? await getActivePlayers() : [];

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Buts</h2>

      {goals.length === 0 ? (
        <p className="text-sm text-steel/70">Aucun but enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
            >
              <div className="text-sm text-cream">
                {goal.scorer_player_id ? (
                  <Link href={`/team/${goal.scorer_player_id}`} className="font-semibold underline-offset-2 hover:underline">
                    {goal.scorer_name}
                  </Link>
                ) : (
                  <span className="font-semibold">{goal.scorer_name ?? "Buteur inconnu"}</span>
                )}
                {goal.assist_name && (
                  <span className="text-steel">
                    {" "}
                    (passe :{" "}
                    {goal.assist_player_id ? (
                      <Link href={`/team/${goal.assist_player_id}`} className="underline-offset-2 hover:underline">
                        {goal.assist_name}
                      </Link>
                    ) : (
                      goal.assist_name
                    )}
                    )
                  </span>
                )}
                {goal.minute != null && <span className="text-steel/70"> · {goal.minute}&apos;</span>}
              </div>
              {isAdmin && (
                <form action={deleteGoal.bind(null, matchId, goal.id)}>
                  <button type="submit" className="text-xs font-medium text-steel/60">
                    Supprimer
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && <AddGoalForm matchId={matchId} players={players} />}
    </section>
  );
}

function AddGoalForm({ matchId, players }: { matchId: string; players: Player[] }) {
  return (
    <form
      action={addGoal.bind(null, matchId)}
      className="mt-4 space-y-3 rounded-xl border border-white/10 bg-navy-card p-3"
    >
      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="scorer_player_id">
          Buteur
        </label>
        <select
          id="scorer_player_id"
          name="scorer_player_id"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        >
          <option value="">— Choisir —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.first_name}
            </option>
          ))}
        </select>
        <label className="mt-1 flex items-center gap-2 text-xs text-steel">
          <input type="checkbox" name="unknown_scorer" />
          Buteur inconnu
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="assist_player_id">
          Passeur (optionnel)
        </label>
        <select
          id="assist_player_id"
          name="assist_player_id"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        >
          <option value="">— Aucun —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.first_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="minute">
          Minute (optionnel)
        </label>
        <input
          id="minute"
          type="number"
          name="minute"
          min={0}
          max={130}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        />
      </div>

      <button type="submit" className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
        Ajouter le but
      </button>
    </form>
  );
}
