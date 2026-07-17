"use client";

import { useState } from "react";

export function CalendarSubscribeLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // le presse-papier peut être refusé (contexte non sécurisé, permission) — pas grave,
      // le lien reste sélectionnable à la main dans le champ.
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-steel/70">
        Ajoute ce lien dans Google Calendar, Apple Calendar ou Outlook (« s&apos;abonner à partir d&apos;une URL »)
        pour voir les matchs se mettre à jour automatiquement, sans réexporter à chaque fois.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-cream/80"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-cream/80"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
    </div>
  );
}
