"use client";

import { useState } from "react";
import { addGoal } from "@/lib/data/goals-actions";
import { PlayerSelect, type PlayerOption } from "@/components/ui/PlayerSelect";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type GoalKind = "classique" | "csc_adverse" | "csc_charenton";

const KIND_OPTIONS: { value: GoalKind; label: string }[] = [
  { value: "classique", label: "But" },
  { value: "csc_adverse", label: "CSC adverse (pour nous)" },
  { value: "csc_charenton", label: "CSC Charenton (contre nous)" },
];

export function AddGoalForm({ matchId, players }: { matchId: string; players: PlayerOption[] }) {
  const [kind, setKind] = useState<GoalKind>("classique");
  // Stable pour toute la durée de vie de ce formulaire monté : un double-clic envoie deux fois la
  // même clé, la seconde insertion est silencieusement ignorée côté serveur (Lot 16).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const action = addGoal.bind(null, matchId);

  return (
    <form action={action} className="mt-4 space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="kind">
          Type
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as GoalKind)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
        >
          {KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {kind === "classique" && (
        <>
          <div>
            <PlayerSelect name="scorer_player_id" label="Buteur" players={players} className="text-sm" />
            <label className="mt-1 flex items-center gap-2 text-xs text-steel">
              <input type="checkbox" name="unknown_scorer" />
              Buteur inconnu
            </label>
          </div>
          <PlayerSelect
            name="assist_player_id"
            label="Passeur (optionnel)"
            players={players}
            placeholder="— Aucun —"
            className="text-sm"
          />
        </>
      )}

      {kind === "csc_charenton" && (
        <PlayerSelect
          name="own_goal_player_id"
          label="Joueur concerné (facultatif)"
          players={players}
          placeholder="— Non précisé —"
          className="text-sm"
        />
      )}

      <Field label="Minute (optionnel)" name="minute" type="number" min={0} max={130} className="text-sm" />

      <Button type="submit" variant="primary" shape="block">
        Ajouter
      </Button>
    </form>
  );
}
