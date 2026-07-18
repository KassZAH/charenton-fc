"use client";

import { useState } from "react";
import { transferOwnership } from "@/lib/data/ownership-actions";

type Candidate = { id: string; displayName: string };

export function TransferOwnershipForm({ candidates }: { candidates: Candidate[] }) {
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? "");
  const [typed, setTyped] = useState("");

  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const matches = !!selected && typed.trim() === selected.displayName;

  if (candidates.length === 0) {
    return <p className="text-sm text-steel/70">Aucun autre joueur actif à qui transférer la propriété.</p>;
  }

  return (
    <form action={transferOwnership.bind(null, selectedId)} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="new_owner">
          Nouveau propriétaire
        </label>
        <select
          id="new_owner"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setTyped("");
          }}
          className="mt-1 w-full rounded-lg border border-red-400/30 bg-white/5 px-3 py-2 text-sm text-cream focus:border-red-400/60 focus:outline-none"
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="confirm_name">
          Retape « {selected?.displayName} » pour confirmer
        </label>
        <input
          id="confirm_name"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-red-400/30 bg-white/5 px-3 py-2 text-sm text-cream focus:border-red-400/60 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={!matches}
        className="w-full rounded-lg border border-red-400/30 bg-red-500/10 py-3 text-sm font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Transférer la propriété du club
      </button>
    </form>
  );
}
