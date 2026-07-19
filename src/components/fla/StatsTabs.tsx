"use client";

import { useState, type ReactNode } from "react";

/**
 * Navigation accessible entre "Stats du club" et "Classement FLA"
 * (roadmap V3, Lot 11.5, §10) — aria-selected, navigation clavier native
 * (boutons), le contenu des deux onglets est déjà rendu côté serveur (pas
 * de rechargement de données au changement d'onglet).
 */
export function StatsTabs({ clubStats, flaStandings }: { clubStats: ReactNode; flaStandings: ReactNode }) {
  const [active, setActive] = useState<"club" | "fla">("club");

  return (
    <div>
      <div role="tablist" aria-label="Statistiques" className="mb-4 flex gap-2 border-b border-white/10">
        <button
          type="button"
          role="tab"
          id="tab-club"
          aria-selected={active === "club"}
          aria-controls="panel-club"
          tabIndex={active === "club" ? 0 : -1}
          onClick={() => setActive("club")}
          className={`px-3 py-2 text-sm font-bold ${
            active === "club" ? "border-b-2 border-gold text-gold" : "text-steel/70"
          }`}
        >
          Stats du club
        </button>
        <button
          type="button"
          role="tab"
          id="tab-fla"
          aria-selected={active === "fla"}
          aria-controls="panel-fla"
          tabIndex={active === "fla" ? 0 : -1}
          onClick={() => setActive("fla")}
          className={`px-3 py-2 text-sm font-bold ${
            active === "fla" ? "border-b-2 border-gold text-gold" : "text-steel/70"
          }`}
        >
          Classement FLA
        </button>
      </div>

      <div id="panel-club" role="tabpanel" aria-labelledby="tab-club" hidden={active !== "club"}>
        {clubStats}
      </div>
      <div id="panel-fla" role="tabpanel" aria-labelledby="tab-fla" hidden={active !== "fla"}>
        {flaStandings}
      </div>
    </div>
  );
}
