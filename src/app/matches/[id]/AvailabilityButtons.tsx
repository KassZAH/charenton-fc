"use client";

import { useState, useTransition } from "react";
import { setAvailability } from "@/lib/data/matches-actions";
import { AVAILABILITY_LABELS } from "@/lib/labels";
import { StatusPicker } from "@/components/ui/StatusPicker";
import type { AvailabilityStatus } from "@/types/models";

const OPTIONS: AvailabilityStatus[] = ["present", "uncertain", "absent", "injured"];
const PICKER_OPTIONS = OPTIONS.map((value) => ({ value, label: AVAILABILITY_LABELS[value] }));

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
      <StatusPicker options={PICKER_OPTIONS} value={status} onSelect={choose} disabled={isPending} />
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
