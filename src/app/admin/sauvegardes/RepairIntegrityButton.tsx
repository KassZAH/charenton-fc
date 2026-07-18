"use client";

import { useState } from "react";
import { repairBackupIntegrityAction } from "@/lib/data/backups-actions";
import { CHECKSUM_STATUS_LABELS } from "@/lib/data/backup-integrity";

/**
 * Visible uniquement quand le backup est au statut "À finaliser — checksum
 * absent" (ex. crash entre la création transactionnelle et la finalisation
 * de ses checksums) — réservée au propriétaire. Recalcule et persiste les
 * checksums côté serveur ; le résultat reste volontairement "Non vérifié",
 * jamais "Intègre" (la vérification reste un acte explicite séparé).
 */
export function RepairIntegrityButton({ backupId }: { backupId: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="mt-1">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const status = await repairBackupIntegrityAction(backupId);
            setResult(CHECKSUM_STATUS_LABELS[status]);
          } catch (e) {
            setResult(e instanceof Error ? e.message : "La finalisation a échoué.");
          } finally {
            setPending(false);
          }
        }}
        className="text-xs font-medium text-gold underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Finalisation…" : "Finaliser l'intégrité"}
      </button>
      {result && <p className="mt-1 text-[11px] text-cream/70">{result}</p>}
    </div>
  );
}
