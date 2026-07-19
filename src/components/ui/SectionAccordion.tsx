"use client";

import { useId, useState, type ReactNode } from "react";

/** Accordéon accessible (roadmap V3, Lot 10) — bouton natif, aria-expanded/aria-controls, navigation clavier native. */
export function SectionAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-cream"
      >
        {title}
        <span aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      <div id={panelId} hidden={!open} className="border-t border-white/10 px-4 py-3">
        {children}
      </div>
    </div>
  );
}
