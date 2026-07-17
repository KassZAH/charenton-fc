"use client";

import { useState, useTransition } from "react";
import { setAvailabilityAsAdmin } from "@/lib/data/matches-actions";
import { AVAILABILITY_LABELS } from "@/lib/labels";
import type { AvailabilityStatus } from "@/types/models";

const OPTIONS: AvailabilityStatus[] = ["present", "uncertain", "absent", "injured"];

export function AdminAvailabilityRow({
  matchId,
  playerId,
  playerName,
  initialStatus,
}: {
  matchId: string;
  playerId: string;
  playerName: string;
  initialStatus: AvailabilityStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function change(value: string) {
    const next = (value || null) as AvailabilityStatus | null;
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      try {
        if (next) await setAvailabilityAsAdmin(matchId, playerId, next);
      } catch {
        setStatus(previous);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-navy-card px-3 py-2">
      <span className="text-sm text-cream">{playerName}</span>
      <select
        value={status ?? ""}
        disabled={isPending}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-cream disabled:opacity-60"
      >
        <option value="">Sans réponse</option>
        {OPTIONS.map((value) => (
          <option key={value} value={value}>
            {AVAILABILITY_LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  );
}
