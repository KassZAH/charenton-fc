"use client";

import { useState, useTransition } from "react";
import { setAvailabilityAsAdmin } from "@/lib/data/matches-actions";
import { adminOverrideInjuredPresence } from "@/lib/data/injuries-actions";
import { AVAILABILITY_LABELS } from "@/lib/labels";
import { InlineChoicePanel } from "@/components/ui/InlineChoicePanel";
import type { AvailabilityStatus } from "@/types/models";

const OPTIONS: AvailabilityStatus[] = ["present", "uncertain", "absent", "injured"];

export function AdminAvailabilityRow({
  matchId,
  playerId,
  playerName,
  initialStatus,
  activeInjuryReturnDateLabel,
  lateResponse,
}: {
  matchId: string;
  playerId: string;
  playerName: string;
  initialStatus: AvailabilityStatus | null;
  activeInjuryReturnDateLabel?: string | null;
  /** Lot 20, roadmap V3 — première réponse arrivée après la date limite, jamais un blocage. */
  lateResponse?: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [showInjuredConfirm, setShowInjuredConfirm] = useState(false);
  const isInjuryCovered = activeInjuryReturnDateLabel !== undefined && activeInjuryReturnDateLabel !== null;

  function commit(next: AvailabilityStatus | null) {
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

  function change(value: string) {
    const next = (value || null) as AvailabilityStatus | null;
    if (next === "present" && isInjuryCovered) {
      setShowInjuredConfirm(true);
      return;
    }
    commit(next);
  }

  function resolveInjured(choice: "this_match_only" | "close_and_present") {
    setShowInjuredConfirm(false);
    const previous = status;
    setStatus("present");
    startTransition(async () => {
      try {
        await adminOverrideInjuredPresence(matchId, playerId, choice);
      } catch {
        setStatus(previous);
      }
    });
  }

  if (showInjuredConfirm) {
    return (
      <InlineChoicePanel
        message={`${playerName} est actuellement marqué blessé. Confirmer sa présence pour ce match ?`}
        options={[
          { label: "Présent pour ce match uniquement", onClick: () => resolveInjured("this_match_only") },
          {
            label: "Clôturer la blessure et le marquer présent",
            onClick: () => resolveInjured("close_and_present"),
          },
          { label: "Annuler", onClick: () => setShowInjuredConfirm(false) },
        ]}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-navy-card px-3 py-2">
      <span className="text-sm text-cream">
        {playerName}
        {lateResponse && (
          <span className="ml-1 text-xs text-gold" title="Réponse arrivée après la date limite">
            ⏰
          </span>
        )}
      </span>
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
