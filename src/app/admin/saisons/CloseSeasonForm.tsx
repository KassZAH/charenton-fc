"use client";

import { useState } from "react";
import { closeSeasonAction } from "@/lib/data/seasons-actions";

type ActivePlayer = { id: string; name: string };

/**
 * Clôture de saison — irréversible en pratique (verrouille la saison source,
 * archive les joueurs cochés, démarre une nouvelle saison). Même pattern que
 * TransferOwnershipForm : le bouton reste désactivé tant que le nom exact de
 * la saison n'est pas retapé, et closeSeasonAction revérifie cette
 * confirmation côté serveur (jamais une confiance côté client seule).
 */
export function CloseSeasonForm({
  oldSeasonId,
  oldSeasonName,
  activePlayers,
}: {
  oldSeasonId: string;
  oldSeasonName: string;
  activePlayers: ActivePlayer[];
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === oldSeasonName;

  return (
    <form action={closeSeasonAction} className="space-y-3 rounded-xl border border-gold/20 bg-navy-card p-3">
      <input type="hidden" name="old_season_id" value={oldSeasonId} />
      <input type="hidden" name="old_season_name" value={oldSeasonName} />

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="name">
          Nom de la nouvelle saison
        </label>
        <input
          id="name"
          type="text"
          name="name"
          required
          placeholder="Saison 2026-2027"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-cream/80" htmlFor="start_date">
            Début
          </label>
          <input
            id="start_date"
            type="date"
            name="start_date"
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cream/80" htmlFor="end_date">
            Fin (facultatif)
          </label>
          <input
            id="end_date"
            type="date"
            name="end_date"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="due_amount">
          Cotisation de la nouvelle saison (facultatif)
        </label>
        <input
          id="due_amount"
          type="number"
          inputMode="decimal"
          name="due_amount"
          min="0"
          step="0.01"
          placeholder="Laisser vide pour ne rien créer"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
        />
        <p className="mt-1 text-xs text-steel/60">
          Si renseigné, une cotisation est créée pour chaque joueur actif restant après archivage.
        </p>
      </div>

      {activePlayers.length > 0 && (
        <div>
          <p className="block text-xs font-medium text-cream/80">Joueurs à archiver (facultatif)</p>
          <p className="mt-0.5 text-xs text-steel/60">
            Leur historique reste intact ; ils n&apos;ont plus de cotisation sur la nouvelle saison.
          </p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {activePlayers.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`archive_${p.id}`}
                  name="archive_player_id"
                  value={p.id}
                  className="h-4 w-4 rounded border-white/20 bg-white/5"
                />
                <label htmlFor={`archive_${p.id}`} className="text-sm text-cream">
                  {p.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-red-400/20 pt-3">
        <label className="block text-xs font-medium text-cream/80" htmlFor="confirm_name">
          Retape « {oldSeasonName} » pour confirmer la clôture
        </label>
        <input
          id="confirm_name"
          type="text"
          name="confirm_name"
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
        Clôturer « {oldSeasonName} » et démarrer la nouvelle saison
      </button>
    </form>
  );
}
