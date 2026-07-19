/** État d'erreur générique (roadmap V3, Lot 10) — bouton Réessayer pour les erreurs réseau. */
export function ErrorState({
  title = "Une erreur est survenue",
  text,
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/5 p-6 text-center">
      <p className="text-sm font-bold text-red-300">{title}</p>
      {text && <p className="mt-1 text-xs text-red-300/70">{text}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
