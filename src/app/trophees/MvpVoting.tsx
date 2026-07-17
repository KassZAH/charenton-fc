"use client";

import { useState, useTransition } from "react";
import { castMonthlyMvpVote } from "@/lib/data/monthly-mvp-actions";
import type { MvpCandidate, MvpTally } from "@/lib/data/monthly-mvp";

export function MvpVoting({
  candidates,
  tally,
  myVote,
}: {
  candidates: MvpCandidate[];
  tally: MvpTally[];
  myVote: string | null;
}) {
  const [selected, setSelected] = useState(myVote);
  const [isPending, startTransition] = useTransition();

  function vote(playerId: string) {
    const previous = selected;
    setSelected(playerId);
    startTransition(async () => {
      try {
        await castMonthlyMvpVote(playerId);
      } catch {
        setSelected(previous);
      }
    });
  }

  const votesByPlayer = new Map(tally.map((t) => [t.playerId, t.votes]));

  return (
    <div className="space-y-2">
      {candidates.map((c) => (
        <button
          key={c.playerId}
          type="button"
          disabled={isPending}
          onClick={() => vote(c.playerId)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left disabled:opacity-60 ${
            selected === c.playerId ? "border-gold/40 bg-gold/10" : "border-white/10 bg-navy-card"
          }`}
        >
          <span className="text-sm text-cream">{c.name}</span>
          <span className="text-sm font-bold text-gold">
            {votesByPlayer.get(c.playerId) ?? 0} vote{(votesByPlayer.get(c.playerId) ?? 0) > 1 ? "s" : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
