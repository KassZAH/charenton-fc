"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Confirmation légère (clic → dialogue → action), pour les mutations qui
 * n'ont aujourd'hui aucune confirmation du tout (roadmap V3, Lot 10 — audit :
 * aucun window.confirm() nulle part dans le code). Ne remplace jamais la
 * confirmation forte par saisie exacte déjà utilisée pour les actions à
 * enjeu élevé (DeleteBackupForm, TransferOwnershipForm, CloseSeasonForm) —
 * `strongConfirmValue` permet néanmoins d'exiger une saisie exacte ici aussi
 * quand c'est justifié, sans dupliquer ce pattern ailleurs.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  strongConfirmValue,
  onConfirm,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" désactive la fermeture par Échap — évite d'annuler par accident une action destructive. */
  variant?: "default" | "danger";
  /** Si fourni, le bouton de confirmation reste désactivé tant que ce texte n'est pas retapé exactement. */
  strongConfirmValue?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  function open() {
    setIsOpen(true);
    setError(null);
    setTypedValue("");
  }
  function close() {
    setIsOpen(false);
  }

  // Mémorise le déclencheur et pose le focus initial dès l'ouverture — jamais dans
  // open()/close() elles-mêmes (accès aux refs réservé aux effets, pas au rendu).
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const node = dialogRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
    return () => {
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  // Focus piégé dans la fenêtre + fermeture Échap (sauf variante danger).
  useEffect(() => {
    if (!isOpen) return;
    const node = dialogRef.current;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && variant !== "danger" && !pending) {
        close();
        return;
      }
      const focusable = node?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pending]);

  if (!isOpen) return <>{trigger(open)}</>;

  const confirmDisabled = pending || (strongConfirmValue !== undefined && typedValue !== strongConfirmValue);

  return (
    <>
      {trigger(open)}
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="presentation">
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-card p-4 shadow-xl shadow-black/40"
        >
          <h2 id={titleId} className="text-sm font-bold text-cream">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1.5 text-xs text-steel/80">
              {description}
            </p>
          )}

          {strongConfirmValue !== undefined && (
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              autoComplete="off"
              autoFocus
              aria-label={`Retape « ${strongConfirmValue} » pour confirmer`}
              placeholder={strongConfirmValue}
              className="mt-3 w-full rounded-lg border border-red-400/30 bg-white/5 px-3 py-2 text-sm text-cream focus:border-red-400/60 focus:outline-none"
            />
          )}

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={async () => {
                setPending(true);
                setError(null);
                try {
                  await onConfirm();
                  close();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "L'action a échoué.");
                } finally {
                  setPending(false);
                }
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                variant === "danger" ? "bg-red-500 text-white" : "bg-gold text-navy-deep"
              }`}
            >
              {pending ? "…" : confirmLabel}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={close}
              className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm font-medium text-cream/80 disabled:opacity-40"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
