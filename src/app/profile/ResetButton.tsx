"use client";

import { useState } from "react";

export function ResetButton({ seasonName }: { seasonName: string }) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === seasonName;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-cream/80" htmlFor="confirm_season_name">
        Retape le nom de la saison (« {seasonName} ») pour confirmer
      </label>
      <input
        id="confirm_season_name"
        type="text"
        name="confirm_season_name"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="w-full rounded-lg border border-red-400/30 bg-white/5 px-3 py-2 text-sm text-cream focus:border-red-400/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!matches}
        className="w-full rounded-lg border border-red-400/30 bg-red-500/10 py-3 text-sm font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Tout réinitialiser (saison « {seasonName} »)
      </button>
    </div>
  );
}
