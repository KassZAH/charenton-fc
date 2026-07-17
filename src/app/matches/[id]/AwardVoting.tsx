"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { castVote } from "@/lib/data/votes-actions";
import { useToast } from "@/components/ui/ToastProvider";
import type { Award, Player } from "@/types/models";

export function AwardVoting({
  matchId,
  award,
  winners,
  totalVotes,
  players,
  myVote,
}: {
  matchId: string;
  award: Award;
  winners: { playerId: string; name: string; votes: number }[];
  totalVotes: number;
  players: Player[];
  myVote: string | null;
}) {
  const [selected, setSelected] = useState(myVote);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function vote(playerId: string) {
    const previous = selected;
    setSelected(playerId);
    startTransition(async () => {
      try {
        await castVote(matchId, award.id, playerId);
        showToast(`Vote enregistré pour ${award.name} ✓`);
      } catch {
        setSelected(previous);
        showToast("Le vote n'a pas pu s'enregistrer.", "error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-navy-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-cream">
          {award.emoji} {award.name}
        </p>
        <p className="text-xs text-steel/70">
          {totalVotes} vote{totalVotes > 1 ? "s" : ""}
        </p>
      </div>

      {winners.length > 0 && (
        <p className="mb-2 text-sm font-semibold text-gold">
          {winners.map((w, i) => (
            <span key={w.playerId}>
              {i > 0 && " / "}
              <Link href={`/team/${w.playerId}`} className="underline-offset-2 hover:underline">
                {w.name}
              </Link>
            </span>
          ))}
          {winners.length > 1 ? " (égalité)" : ""} — {winners[0].votes} vote
          {winners[0].votes > 1 ? "s" : ""}
        </p>
      )}

      <select
        value={selected ?? ""}
        disabled={isPending}
        onChange={(e) => e.target.value && vote(e.target.value)}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream disabled:opacity-60"
      >
        <option value="">{myVote ? "Changer mon vote" : "Voter pour..."}</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname || p.first_name}
          </option>
        ))}
      </select>
    </div>
  );
}
