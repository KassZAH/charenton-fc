import Link from "next/link";
import { getMatchGoals } from "@/lib/data/goals";
import { addGoal, deleteGoal } from "@/lib/data/goals-actions";
import { getActivePlayers } from "@/lib/data/players";
import { PlayerSelect } from "@/components/ui/PlayerSelect";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
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
  const options = players.map((p) => ({ id: p.id, name: p.nickname || p.first_name }));

  return (
    <form
      action={addGoal.bind(null, matchId)}
      className="mt-4 space-y-3 rounded-xl border border-white/10 bg-navy-card p-3"
    >
      <div>
        <PlayerSelect name="scorer_player_id" label="Buteur" players={options} className="text-sm" />
        <label className="mt-1 flex items-center gap-2 text-xs text-steel">
          <input type="checkbox" name="unknown_scorer" />
          Buteur inconnu
        </label>
      </div>

      <PlayerSelect
        name="assist_player_id"
        label="Passeur (optionnel)"
        players={options}
        placeholder="— Aucun —"
        className="text-sm"
      />

      <Field label="Minute (optionnel)" name="minute" type="number" min={0} max={130} className="text-sm" />

      <Button type="submit" variant="primary" shape="block">
        Ajouter le but
      </Button>
    </form>
  );
}
