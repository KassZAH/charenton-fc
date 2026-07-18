"use client";

import { useState } from "react";
import { checkBackupIntegrityAction } from "@/lib/data/backups-actions";
import { CHECKSUM_STATUS_LABELS } from "@/lib/data/backup-integrity";

/**
 * Recalcule réellement le checksum côté serveur (requireFreshCoach(), jamais
 * de contenu renvoyé au client) — accessible à tout coach, pas seulement au
 * propriétaire. Le badge de la liste ne reflète que la présence du
 * checksum ; ce bouton est le seul endroit où "Intègre"/"Divergence
 * détectée" peuvent réellement apparaître.
 */
export function VerifyIntegrityButton({ backupId }: { backupId: string }) {
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
            const { checksumStatus, missingTables, countMismatches } = await checkBackupIntegrityAction(backupId);
            const anomalies = [
              ...missingTables.map((t) => `table manquante : ${t}`),
              ...countMismatches.map((m) => `${m.table} : ${m.declared} attendu(s), ${m.actual} réel(s)`),
            ];
            setResult(CHECKSUM_STATUS_LABELS[checksumStatus] + (anomalies.length ? ` — ${anomalies.join(" ; ")}` : ""));
          } catch (e) {
            setResult(e instanceof Error ? e.message : "La vérification a échoué.");
          } finally {
            setPending(false);
          }
        }}
        className="text-xs font-medium text-gold underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Vérification…" : "Vérifier l'intégrité"}
      </button>
      {result && <p className="mt-1 text-[11px] text-cream/70">{result}</p>}
    </div>
  );
}
