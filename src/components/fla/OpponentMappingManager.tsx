"use client";

import { useState, useTransition } from "react";
import {
  confirmOpponentMapping,
  selectOpponentMapping,
  disableOpponentMapping,
  resetOpponentMapping,
} from "@/lib/data/opponent-mappings-actions";
import { useToast } from "@/components/ui/ToastProvider";
import type { ExternalStanding, MappingStatus, OpponentExternalMapping } from "@/lib/fla/types";

const STATUS_LABELS: Record<MappingStatus, string> = {
  automatic: "Automatique",
  confirmed: "Confirmée",
  ambiguous: "À vérifier",
  unmatched: "Aucune correspondance",
  disabled: "Désactivée",
};

/**
 * Interface Propriétaire de gestion des associations adversaire <-> équipe
 * externe (roadmap V3, Lot 11.5, §14) — voir, confirmer, sélectionner une
 * autre équipe, désactiver, remettre en attente. Toute mutation passe par
 * requireOwner() côté serveur (les Server Actions elles-mêmes) ; ce
 * composant n'est de toute façon monté que pour le Propriétaire par
 * l'appelant.
 */
export function OpponentMappingManager({
  mappings,
  standings,
}: {
  mappings: OpponentExternalMapping[];
  standings: ExternalStanding[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function run(id: string, action: () => Promise<void>, successMessage: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await action();
        showToast(successMessage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "L'action a échoué.");
      } finally {
        setPendingId(null);
      }
    });
  }

  if (mappings.length === 0) {
    return <p className="text-xs text-steel/60">Aucune association à afficher — synchronise le classement d&apos;abord.</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
      <ul className="space-y-1.5">
        {mappings.map((m) => (
          <li key={m.id} className="rounded-lg border border-white/10 bg-navy-card p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-cream">{m.app_opponent_name}</p>
                <p className="text-steel/70">
                  {STATUS_LABELS[m.mapping_status]}
                  {m.external_team_name && ` — ${m.external_team_name}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {m.mapping_status !== "confirmed" && m.external_team_name && (
                  <button
                    type="button"
                    disabled={isPending && pendingId === m.id}
                    onClick={() => run(m.id, () => confirmOpponentMapping(m.id), "Association confirmée.")}
                    className="rounded-full border border-gold/40 px-2 py-0.5 font-bold text-gold"
                  >
                    Confirmer
                  </button>
                )}
                {m.mapping_status !== "disabled" && (
                  <button
                    type="button"
                    disabled={isPending && pendingId === m.id}
                    onClick={() => run(m.id, () => disableOpponentMapping(m.id), "Association désactivée.")}
                    className="rounded-full border border-white/15 px-2 py-0.5 text-steel/70"
                  >
                    Désactiver
                  </button>
                )}
                {(m.mapping_status === "confirmed" || m.mapping_status === "disabled") && (
                  <button
                    type="button"
                    disabled={isPending && pendingId === m.id}
                    onClick={() => run(m.id, () => resetOpponentMapping(m.id), "Association remise en attente.")}
                    className="rounded-full border border-white/15 px-2 py-0.5 text-steel/70"
                  >
                    Remettre en attente
                  </button>
                )}
              </div>
            </div>

            <label className="mt-2 block">
              <span className="sr-only">Choisir une autre équipe pour {m.app_opponent_name}</span>
              <select
                disabled={isPending && pendingId === m.id}
                defaultValue=""
                onChange={(e) => {
                  const team = standings.find((s) => s.id === e.target.value);
                  if (!team) return;
                  run(m.id, () => selectOpponentMapping(m.id, team.external_team_id, team.team_name), "Autre équipe sélectionnée.");
                }}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-cream"
              >
                <option value="" disabled>
                  Choisir une autre équipe…
                </option>
                {standings.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.team_name}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
