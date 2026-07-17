import { getMatchAwardResults, getMyVotes } from "@/lib/data/awards";
import { createOneOffAward } from "@/lib/data/awards-actions";
import { getActivePlayers } from "@/lib/data/players";
import { AwardVoting } from "./AwardVoting";

export async function AwardsSection({
  matchId,
  myPlayerId,
  isAdmin = false,
}: {
  matchId: string;
  myPlayerId: string;
  isAdmin?: boolean;
}) {
  const [results, myVotes, players] = await Promise.all([
    getMatchAwardResults(matchId),
    getMyVotes(matchId, myPlayerId),
    getActivePlayers(),
  ]);

  if (results.length === 0 && !isAdmin) return null;

  const votablePlayers = players.filter((p) => p.id !== myPlayerId);

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Récompenses du match</h2>
      <div className="space-y-3">
        {results.map((result) => (
          <AwardVoting
            key={result.award.id}
            matchId={matchId}
            award={result.award}
            winners={result.winners}
            totalVotes={result.totalVotes}
            players={votablePlayers}
            myVote={myVotes.get(result.award.id) ?? null}
          />
        ))}
      </div>

      {isAdmin && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-steel/70">
            Créer une récompense ponctuelle pour ce match
          </summary>
          <form action={createOneOffAward.bind(null, matchId)} className="mt-3 flex items-end gap-2">
            <div className="w-14">
              <label className="block text-xs font-medium text-cream/80" htmlFor="emoji">
                Emoji
              </label>
              <input
                id="emoji"
                type="text"
                name="emoji"
                maxLength={4}
                placeholder="🎉"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-center text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-cream/80" htmlFor="name">
                Nom de la récompense
              </label>
              <input
                id="name"
                type="text"
                name="name"
                required
                placeholder="Ex. Blague du match"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
              />
            </div>
            <button type="submit" className="shrink-0 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-navy-deep">
              Créer
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
