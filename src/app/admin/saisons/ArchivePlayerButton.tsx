"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { setPlayerStatus } from "@/lib/data/players-actions";

/**
 * Remplace le formulaire d'archivage sans confirmation (roadmap V3, Lot 10 —
 * audit : aucun window.confirm() nulle part dans le code, cette action
 * n'en avait aucune). L'archivage reste réversible (setPlayerStatus vers
 * "active" existe déjà ailleurs) — la confirmation reste donc légère, pas
 * une saisie exacte comme pour les actions vraiment irréversibles.
 */
export function ArchivePlayerButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const { showToast } = useToast();

  return (
    <ConfirmDialog
      title={`Archiver ${playerName} ?`}
      description="Son historique reste intact — il disparaît juste des listes actives. Réversible depuis la fiche joueur."
      confirmLabel="Archiver"
      trigger={(open) => (
        <button type="button" onClick={open} className="text-xs font-medium text-steel/60">
          Archiver
        </button>
      )}
      onConfirm={async () => {
        await setPlayerStatus(playerId, "archived");
        showToast(`${playerName} archivé.`);
      }}
    />
  );
}
