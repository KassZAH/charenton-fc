import type { ReactNode } from "react";

/** État vide générique (roadmap V3, Lot 10) — jamais une page blanche silencieuse. */
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-card p-6 text-center">
      <p className="text-sm font-bold text-cream">{title}</p>
      {text && <p className="mt-1 text-xs text-steel/70">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
