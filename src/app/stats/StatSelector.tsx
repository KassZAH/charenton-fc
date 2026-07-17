"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerCount } from "@/lib/data/stats";

export type StatCategory = { key: string; title: string; rows: PlayerCount[] };

export function StatSelector({ categories }: { categories: StatCategory[] }) {
  const [selectedKey, setSelectedKey] = useState(categories[0]?.key ?? "");
  const selected = categories.find((c) => c.key === selectedKey) ?? categories[0];

  if (!selected) return null;

  return (
    <section className="mb-6">
      <label className="sr-only" htmlFor="stat-category">
        Classement
      </label>
      <select
        id="stat-category"
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
        className="mb-3 w-full rounded-lg border border-white/15 bg-navy-card px-3 py-2 text-sm font-semibold text-cream focus:border-gold/50 focus:outline-none"
      >
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.title}
          </option>
        ))}
      </select>

      {selected.rows.length === 0 ? (
        <p className="text-sm text-steel/70">Aucune donnée pour le moment.</p>
      ) : (
        <ol className="space-y-1.5">
          {selected.rows.map((row, i) => (
            <li key={row.playerId}>
              <Link
                href={`/team/${row.playerId}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
              >
                <span className="text-sm text-cream">
                  <span className="mr-2 text-steel/60">{i + 1}.</span>
                  {row.name}
                </span>
                <span className="text-sm font-bold text-gold">{row.count}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
