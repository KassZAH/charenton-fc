"use client";

import { useState, useTransition } from "react";
import { FORMATIONS, FORMATION_LABELS, type FormationKey } from "@/lib/formations";
import { saveLineup } from "@/lib/data/lineup-actions";

type PlayerOption = { id: string; name: string };

export function LineupBoard({
  matchId,
  players,
  initialFormation,
  initialPositions,
}: {
  matchId: string;
  players: PlayerOption[];
  initialFormation: FormationKey;
  initialPositions: Record<string, string>;
}) {
  const [formation, setFormation] = useState<FormationKey>(initialFormation);
  const [positions, setPositions] = useState<Record<string, string>>(initialPositions);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const slots = FORMATIONS[formation];
  const usedPlayerIds = new Set(Object.values(positions).filter(Boolean));

  function setSlot(slotKey: string, playerId: string) {
    setSaved(false);
    setPositions((prev) => {
      const next = { ...prev };
      if (playerId) next[slotKey] = playerId;
      else delete next[slotKey];
      return next;
    });
  }

  function changeFormation(next: FormationKey) {
    setFormation(next);
    // On garde les affectations qui ont un sens dans la nouvelle formation (même clé de poste).
    const validKeys = new Set(FORMATIONS[next].map((s) => s.key));
    setPositions((prev) => {
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (validKeys.has(key)) filtered[key] = value;
      }
      return filtered;
    });
  }

  function submit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveLineup(matchId, formData);
      setSaved(true);
    });
  }

  function playerLabel(playerId: string | undefined) {
    if (!playerId) return null;
    return players.find((p) => p.id === playerId)?.name ?? null;
  }

  return (
    <form action={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-navy" htmlFor="formation">
          Formation
        </label>
        <select
          id="formation"
          name="formation"
          value={formation}
          onChange={(e) => changeFormation(e.target.value as FormationKey)}
          className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
        >
          {(Object.keys(FORMATIONS) as FormationKey[]).map((key) => (
            <option key={key} value={key}>
              {FORMATION_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="relative mx-auto aspect-[2/3] w-full max-w-xs overflow-hidden rounded-2xl bg-emerald-700">
        <div className="absolute inset-x-4 top-4 bottom-4 rounded-lg border border-white/25" />
        <div className="absolute inset-x-4 top-1/2 h-px bg-white/25" />
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        {slots.map((slot) => {
          const label = playerLabel(positions[slot.key]);
          const display = label ? (label.length > 9 ? `${label.slice(0, 8)}…` : label) : "—";
          return (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <span
                className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold shadow ${
                  label ? "bg-white text-navy" : "bg-white/40 text-navy/60"
                }`}
              >
                {display}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.key} className="flex items-center justify-between gap-2">
            <label className="w-32 shrink-0 text-xs font-medium text-navy/70" htmlFor={`slot_${slot.key}`}>
              {slot.label}
            </label>
            <select
              id={`slot_${slot.key}`}
              name={`slot_${slot.key}`}
              value={positions[slot.key] ?? ""}
              onChange={(e) => setSlot(slot.key, e.target.value)}
              className="flex-1 rounded-lg border border-navy/20 px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              {players.map((p) => (
                <option key={p.id} value={p.id} disabled={usedPlayerIds.has(p.id) && positions[slot.key] !== p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold disabled:opacity-60"
      >
        {isPending ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer la composition"}
      </button>
    </form>
  );
}
