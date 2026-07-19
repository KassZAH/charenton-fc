"use client";

import { useState, useTransition } from "react";
import { syncExternalStandingsAction } from "@/lib/data/external-standings-actions";
import { useToast } from "@/components/ui/ToastProvider";

const STATUS_MESSAGES: Record<string, string> = {
  success: "Classement mis à jour.",
  empty: "Synchronisé — la FLA n'a pas encore publié de classement.",
  unavailable: "La FLA est momentanément injoignable — le dernier classement connu reste affiché.",
  invalid_payload: "Réponse inattendue de la FLA — le dernier classement connu reste affiché.",
  disabled: "Synchronisation désactivée pour cette compétition.",
};

/** Réservé au Propriétaire (roadmap V3, Lot 11.5, §8) — Coach et Joueur n'ont aucun bouton de synchronisation. */
export function SyncFlaButton({ externalCompetitionId }: { externalCompetitionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await syncExternalStandingsAction(externalCompetitionId);
              showToast(STATUS_MESSAGES[result.status] ?? "Synchronisation terminée.", result.status === "success" || result.status === "empty" ? "success" : "error");
            } catch (e) {
              setError(e instanceof Error ? e.message : "La synchronisation a échoué.");
            }
          });
        }}
        className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold disabled:opacity-50"
      >
        {isPending ? "Synchronisation…" : "Actualiser le classement FLA"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
