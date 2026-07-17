"use client";

import { useState, useTransition } from "react";
import { setAvailability } from "@/lib/data/matches-actions";
import { AVAILABILITY_LABELS } from "@/lib/labels";
import type { AvailabilityStatus } from "@/types/models";

const OPTIONS: AvailabilityStatus[] = ["present", "uncertain", "absent", "injured"];

export function AvailabilityButtons({
  matchId,
  initialStatus,
}: {
  matchId: string;
  initialStatus: AvailabilityStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [needsRefresh, setNeedsRefresh] = useState(false);

  function choose(value: AvailabilityStatus) {
    const previous = status;
    setStatus(value);
    setNeedsRefresh(false);
    startTransition(async () => {
      try {
        await setAvailability(matchId, value);
      } catch {
        setStatus(previous);
        setNeedsRefresh(true);
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => choose(value)}
            className={`rounded-xl border py-3 text-sm font-bold transition disabled:opacity-60 ${
              status === value
                ? "border-gold bg-gold text-navy-deep"
                : "border-white/15 bg-white/5 text-cream/80"
            }`}
          >
            {AVAILABILITY_LABELS[value]}
          </button>
        ))}
      </div>
      {needsRefresh && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs text-cream/80">
          <span>Ça n&apos;a pas pu s&apos;enregistrer. Réactualise la page et réessaie.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-2 shrink-0 rounded-full border border-white/20 px-3 py-1 font-semibold text-cream"
          >
            Réactualiser
          </button>
        </div>
      )}
    </div>
  );
}
