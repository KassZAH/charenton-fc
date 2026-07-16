"use client";

import { useState, useTransition } from "react";
import { setAvailability } from "@/lib/data/matches-actions";
import { AVAILABILITY_LABELS } from "@/lib/labels";
import type { AvailabilityStatus } from "@/types/models";

const OPTIONS: AvailabilityStatus[] = ["present", "unsure", "absent", "injured"];

export function AvailabilityButtons({
  matchId,
  initialStatus,
}: {
  matchId: string;
  initialStatus: AvailabilityStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function choose(value: AvailabilityStatus) {
    const previous = status;
    setStatus(value);
    startTransition(async () => {
      try {
        await setAvailability(matchId, value);
      } catch {
        setStatus(previous);
      }
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((value) => (
        <button
          key={value}
          type="button"
          disabled={isPending}
          onClick={() => choose(value)}
          className={`rounded-xl border py-3 text-sm font-semibold transition disabled:opacity-60 ${
            status === value ? "border-navy bg-navy text-gold" : "border-navy/15 bg-white text-navy"
          }`}
        >
          {AVAILABILITY_LABELS[value]}
        </button>
      ))}
    </div>
  );
}
