"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem } from "@/lib/data/checklist-actions";
import type { MatchChecklistItem } from "@/types/models";

/**
 * Strictement privée (Lot 24, roadmap V3) : chaque joueur ne voit que sa propre checklist, se
 * réinitialise naturellement d'un match à l'autre (match_checklist_items est propre à un match),
 * n'affecte aucune statistique publique.
 */
export function ChecklistSection({ matchId, items }: { matchId: string; items: MatchChecklistItem[] }) {
  const [checkedById, setCheckedById] = useState(new Map(items.map((i) => [i.id, i.checked])));
  const [, startTransition] = useTransition();

  if (items.length === 0) return null;

  function toggle(itemId: string, checked: boolean) {
    setCheckedById((prev) => new Map(prev).set(itemId, checked));
    startTransition(async () => {
      try {
        await toggleChecklistItem(matchId, itemId, checked);
      } catch {
        setCheckedById((prev) => new Map(prev).set(itemId, !checked));
      }
    });
  }

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-1 text-sm font-bold text-cream">Ma checklist</h2>
      <p className="mb-3 text-xs text-steel/70">Privée — visible seulement par toi.</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy-card px-3 py-2">
            <input
              type="checkbox"
              checked={checkedById.get(item.id) ?? item.checked}
              onChange={(e) => toggle(item.id, e.target.checked)}
            />
            <span className={`text-sm ${checkedById.get(item.id) ? "text-steel line-through" : "text-cream"}`}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
