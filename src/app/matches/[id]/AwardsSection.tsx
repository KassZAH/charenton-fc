import { getMatchAwardResults, getMyVotes } from "@/lib/data/awards";
import { getActivePlayers } from "@/lib/data/players";
import { AwardVoting } from "./AwardVoting";

export async function AwardsSection({
  matchId,
  myPlayerId,
}: {
  matchId: string;
  myPlayerId: string;
}) {
  const [results, myVotes, players] = await Promise.all([
    getMatchAwardResults(matchId),
    getMyVotes(matchId, myPlayerId),
    getActivePlayers(),
  ]);

  if (results.length === 0) return null;

  const votablePlayers = players.filter((p) => p.id !== myPlayerId);

  return (
    <section className="mt-8 border-t border-navy/10 pt-6">
      <h2 className="mb-3 text-sm font-semibold text-navy">Récompenses du match</h2>
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
    </section>
  );
}
