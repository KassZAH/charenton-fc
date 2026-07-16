import Link from "next/link";
import { getMatchGoals } from "@/lib/data/goals";
import { addGoal, deleteGoal } from "@/lib/data/goals-actions";
import { getActivePlayers } from "@/lib/data/players";
import type { Player } from "@/types/models";

export async function GoalsSection({ matchId, isAdmin }: { matchId: string; isAdmin: boolean }) {
  const goals = await getMatchGoals(matchId);
  const players = isAdmin ? await getActivePlayers() : [];

  return (
    <section className="mt-8 border-t border-navy/10 pt-6">
      <h2 className="mb-3 text-sm font-semibold text-navy">Buts</h2>

      {goals.length === 0 ? (
        <p className="text-sm text-navy/50">Aucun but enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center justify-between rounded-xl border border-navy/10 bg-white p-3"
            >
              <div className="text-sm text-navy">
                {goal.scorer_player_id ? (
                  <Link href={`/team/${goal.scorer_player_id}`} className="font-semibold underline-offset-2 hover:underline">
                    {goal.scorer_name}
                  </Link>
                ) : (
                  <span className="font-semibold">{goal.scorer_name ?? "Buteur inconnu"}</span>
                )}
                {goal.assist_name && (
                  <span className="text-navy/60">
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
                {goal.minute != null && <span className="text-navy/50"> · {goal.minute}&apos;</span>}
              </div>
              {isAdmin && (
                <form action={deleteGoal.bind(null, matchId, goal.id)}>
                  <button type="submit" className="text-xs font-medium text-navy/40">
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
      className="mt-4 space-y-3 rounded-xl border border-navy/10 bg-white p-3"
    >
      <div>
        <label className="block text-xs font-medium text-navy" htmlFor="scorer_player_id">
          Buteur
        </label>
        <select
          id="scorer_player_id"
          name="scorer_player_id"
          className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2 text-sm"
        >
          <option value="">— Choisir —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.first_name}
            </option>
          ))}
        </select>
        <label className="mt-1 flex items-center gap-2 text-xs text-navy/60">
          <input type="checkbox" name="unknown_scorer" />
          Buteur inconnu
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-navy" htmlFor="assist_player_id">
          Passeur (optionnel)
        </label>
        <select
          id="assist_player_id"
          name="assist_player_id"
          className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2 text-sm"
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
        <label className="block text-xs font-medium text-navy" htmlFor="minute">
          Minute (optionnel)
        </label>
        <input
          id="minute"
          type="number"
          name="minute"
          min={0}
          max={130}
          className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2 text-sm"
        />
      </div>

      <button type="submit" className="w-full rounded-lg bg-navy py-2 text-sm font-semibold text-gold">
        Ajouter le but
      </button>
    </form>
  );
}
