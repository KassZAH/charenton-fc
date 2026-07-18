"use client";

import { useState } from "react";
import { checkBackupIntegrityAction } from "@/lib/data/backups-actions";

/**
 * Vérifie l'intégrité juste avant de déclencher le téléchargement — en cas
 * de divergence, demande une confirmation forte plutôt que de bloquer ou de
 * supprimer/remplacer automatiquement le backup (roadmap V3, Lot 6).
 */
export function DownloadBackupButton({ backupId, href }: { backupId: string; href: string }) {
  const [checking, setChecking] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setChecking(true);
    try {
      const status = await checkBackupIntegrityAction(backupId);
      if (status === "mismatch") {
        const confirmed = window.confirm(
          "Le checksum de cette sauvegarde ne correspond pas à l'attendu.\n\n" +
            "Cause possible : modification, migration antérieure, ou anomalie technique — à examiner. " +
            "Le fichier reste téléchargeable tel quel.\n\nTélécharger quand même ?"
        );
        if (!confirmed) return;
      }
      window.location.href = href;
    } finally {
      setChecking(false);
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-disabled={checking}
      className="mt-2 inline-block text-xs font-medium text-gold underline underline-offset-2"
    >
      {checking ? "Vérification…" : "Télécharger le JSON complet"}
    </a>
  );
}
