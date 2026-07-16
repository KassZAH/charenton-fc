"use client";

import { useState, useTransition } from "react";
import { createMatchesBulk } from "@/lib/data/matches-actions";
import type { Opponent } from "@/types/models";

type Row = { id: number; opponentId: string; newOpponentName: string; date: string };

let nextRowId = 1;
function emptyRow(): Row {
  return { id: nextRowId++, opponentId: "", newOpponentName: "", date: "" };
}

export function BulkMatchForm({ opponents }: { opponents: Opponent[] }) {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createMatchesBulk(
          rows.map((r) => ({
            opponentId: r.opponentId || null,
            newOpponentName: r.newOpponentName,
            date: r.date,
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={row.id} className="space-y-2 rounded-xl border border-navy/10 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-navy/50">Match {i + 1}</p>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs font-medium text-navy/40"
              >
                Retirer
              </button>
            )}
          </div>

          <select
            value={row.opponentId}
            onChange={(e) => updateRow(row.id, { opponentId: e.target.value, newOpponentName: "" })}
            className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm"
          >
            <option value="">— Adversaire existant —</option>
            {opponents.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={row.newOpponentName}
            onChange={(e) => updateRow(row.id, { newOpponentName: e.target.value, opponentId: "" })}
            placeholder="Ou nouvel adversaire"
            className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={row.date}
            onChange={(e) => updateRow(row.id, { date: e.target.value })}
            className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-lg border border-navy/20 py-2 text-sm font-medium text-navy/70"
      >
        + Ajouter un match
      </button>

      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold disabled:opacity-60"
      >
        {isPending ? "Création..." : rows.length > 1 ? `Créer les ${rows.length} matchs` : "Créer le match"}
      </button>
    </div>
  );
}
