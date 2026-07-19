"use client";

import { useEffect, useState } from "react";

/** Chronomètre indicatif basé sur started_at (roadmap V3, Lot 15, V2 §5.3) — jamais présenté comme officiel. */
export function LiveTimer({ startedAt }: { startedAt: string }) {
  const [minutes, setMinutes] = useState(() => elapsedMinutes(startedAt));

  useEffect(() => {
    const interval = setInterval(() => setMinutes(elapsedMinutes(startedAt)), 15_000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="tabular-nums" title="Chronomètre indicatif, non officiel">
      {minutes}&apos;
    </span>
  );
}

function elapsedMinutes(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
}
