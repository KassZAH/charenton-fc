/**
 * Squelette de chargement générique (roadmap V3, Lot 10) — jamais de page
 * blanche pendant un chargement. `motion-reduce:animate-none` : la pulsation
 * n'est pas désactivée automatiquement par Tailwind, il faut l'expliciter.
 */
export function LoadingSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse motion-reduce:animate-none space-y-2 ${className}`} role="status" aria-label="Chargement en cours">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-white/10" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}
