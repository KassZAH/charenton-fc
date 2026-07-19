type Variant = "success" | "warning" | "error" | "info" | "neutral";

/**
 * Statut visuel (roadmap V3, Lot 10) — icône/forme + texte, jamais la
 * couleur seule (accessibilité pour le daltonisme et la lecture d'écran).
 * Couleur sémantique (succès/erreur/…) toujours distincte de l'accent doré
 * de l'app, pour ne jamais confondre "important" et "état".
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  error: "border-red-400/30 bg-red-500/10 text-red-300",
  info: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  neutral: "border-white/15 bg-white/5 text-steel",
};

const VARIANT_SYMBOL: Record<Variant, string> = {
  success: "●",
  warning: "▲",
  error: "✕",
  info: "ℹ",
  neutral: "○",
};

export function StatusBadge({ variant, label }: { variant: Variant; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${VARIANT_CLASSES[variant]}`}
    >
      <span aria-hidden="true">{VARIANT_SYMBOL[variant]}</span>
      {label}
    </span>
  );
}
