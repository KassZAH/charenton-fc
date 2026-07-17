import Link from "next/link";
import { getMatchGoals } from "@/lib/data/goals";
import { deleteGoal } from "@/lib/data/goals-actions";
import { getActivePlayers } from "@/lib/data/players";
import { AddGoalForm } from "./AddGoalForm";

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
                {goal.credited_to === "opponent" && (
                  <span className="ml-1 rounded-full bg-red-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                    Contre nous
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

      {isAdmin && (
        <AddGoalForm
          matchId={matchId}
          players={players.map((p) => ({ id: p.id, name: p.nickname || p.first_name }))}
        />
      )}
    </section>
  );
}
