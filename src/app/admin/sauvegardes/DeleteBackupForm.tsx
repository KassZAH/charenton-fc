"use client";

import { useState } from "react";
import { deleteBackupAction } from "@/lib/data/backups-actions";

/** Réservé aux backups non protégés (le bouton n'est même rendu que pour ceux-là côté page) — confirmation par saisie exacte du libellé. */
export function DeleteBackupForm({ backupId, label }: { backupId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-medium text-red-400 underline underline-offset-2"
      >
        Supprimer
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-red-400/30 bg-red-400/5 p-2">
      <p className="text-xs text-cream/80">
        Pour confirmer, retape exactement le libellé : <span className="font-semibold">{label}</span>
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-cream focus:border-red-400/50 focus:outline-none"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              await deleteBackupAction(backupId, value);
            } catch (e) {
              setError(e instanceof Error ? e.message : "La suppression a échoué.");
              setPending(false);
            }
          }}
          className="rounded-lg bg-red-400 px-3 py-1 text-xs font-bold text-navy-deep disabled:opacity-50"
        >
          {pending ? "Suppression…" : "Confirmer la suppression"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue("");
            setError(null);
          }}
          className="rounded-lg px-3 py-1 text-xs font-medium text-steel"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
