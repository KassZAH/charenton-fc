"use client";

import { useState } from "react";
import { duplicateMatch } from "@/lib/data/matches-actions";

export function DuplicateMatchForm({ matchId, opponentLabel }: { matchId: string; opponentLabel: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = duplicateMatch.bind(null, matchId);

  async function submit(formData: FormData) {
    setError(null);
    try {
      await action(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80"
      >
        Rejouer contre {opponentLabel}
      </button>
    );
  }

  return (
    <form action={submit} className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
      <p className="text-sm font-semibold text-cream">Nouveau match contre {opponentLabel}</p>
      <label className="block text-sm text-cream">
        Date
        <input
          type="date"
          name="match_date"
          required
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
        />
      </label>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-cream/80">Reprendre du match précédent</p>
        {[
          { name: "reuse_roster", label: "Les présents" },
          { name: "reuse_lineup", label: "La composition" },
          { name: "reuse_equipment", label: "Le matériel" },
          { name: "reuse_captain", label: "Le capitaine" },
        ].map((opt) => (
          <label key={opt.name} className="flex items-center gap-2 text-xs text-steel">
            <input type="checkbox" name={opt.name} />
            {opt.label}
          </label>
        ))}
      </div>

      {error && (
        <p className="text-sm font-medium text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
          Créer le match
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-cream/80"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
