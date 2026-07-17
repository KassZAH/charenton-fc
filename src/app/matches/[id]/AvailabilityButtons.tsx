"use client";

import { useState, useTransition } from "react";
import { setAvailability } from "@/lib/data/matches-actions";
import { resolveInjuredPresence } from "@/lib/data/injuries-actions";
import { AVAILABILITY_LABELS } from "@/lib/labels";
import { StatusPicker } from "@/components/ui/StatusPicker";
import { InlineChoicePanel } from "@/components/ui/InlineChoicePanel";
import { useToast } from "@/components/ui/ToastProvider";
import type { AvailabilityStatus } from "@/types/models";

const OPTIONS: AvailabilityStatus[] = ["present", "uncertain", "absent", "injured"];
const PICKER_OPTIONS = OPTIONS.map((value) => ({ value, label: AVAILABILITY_LABELS[value] }));

export function AvailabilityButtons({
  matchId,
  initialStatus,
  /** Date de retour estimée si ce match est couvert par une blessure active du joueur, "" si durée inconnue. */
  activeInjuryReturnDateLabel,
}: {
  matchId: string;
  initialStatus: AvailabilityStatus | null;
  activeInjuryReturnDateLabel?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [showInjuredConfirm, setShowInjuredConfirm] = useState(false);
  const isInjuryCovered = activeInjuryReturnDateLabel !== undefined && activeInjuryReturnDateLabel !== null;
  const { showToast } = useToast();

  function commit(value: AvailabilityStatus) {
    const previous = status;
    setStatus(value);
    setNeedsRefresh(false);
    startTransition(async () => {
      try {
        await setAvailability(matchId, value);
        showToast(`Présence enregistrée : ${AVAILABILITY_LABELS[value]} ✓`);
      } catch {
        setStatus(previous);
        setNeedsRefresh(true);
      }
    });
  }

  function choose(value: AvailabilityStatus) {
    if (value === "present" && isInjuryCovered) {
      setShowInjuredConfirm(true);
      return;
    }
    commit(value);
  }

  function resolveInjured(choice: "recovered" | "play_anyway") {
    setShowInjuredConfirm(false);
    const previous = status;
    setStatus("present");
    startTransition(async () => {
      try {
        await resolveInjuredPresence(matchId, choice);
        showToast("Présence enregistrée : Présent ✓");
      } catch {
        setStatus(previous);
        setNeedsRefresh(true);
      }
    });
  }

  if (showInjuredConfirm) {
    return (
      <InlineChoicePanel
        message={`Tu es indiqué blessé${
          activeInjuryReturnDateLabel ? ` jusqu'au ${activeInjuryReturnDateLabel}` : ""
        }. Que veux-tu faire ?`}
        options={[
          { label: "✅ Je suis rétabli", onClick: () => resolveInjured("recovered") },
          { label: "⚽ Je joue malgré la blessure", onClick: () => resolveInjured("play_anyway") },
          { label: "✏️ La durée était incorrecte", href: "/profile" },
          { label: "Annuler", onClick: () => setShowInjuredConfirm(false) },
        ]}
      />
    );
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
