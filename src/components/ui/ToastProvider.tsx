"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; variant: "success" | "error"; action?: ToastAction };

type ToastContextValue = {
  showToast: (message: string, variant?: "success" | "error") => void;
  /**
   * UndoToast (roadmap V3, Lot 10) : action "Annuler" clairement identifiable, durée plus longue
   * qu'un toast simple pour laisser le temps de réagir. `message` doit décrire ce qui vient de se
   * passer sans jamais prétendre que l'action est annulable si elle ne l'est pas réellement — c'est
   * à l'appelant de ne passer un `onUndo` que pour une action véritablement réversible.
   */
  showUndoToast: (message: string, undoLabel: string, onUndo: () => void) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 2600;
const UNDO_AUTO_DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const showUndoToast = useCallback(
    (message: string, undoLabel: string, onUndo: () => void) => {
      const id = nextId.current++;
      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          variant: "success",
          action: {
            label: undoLabel,
            onClick: () => {
              onUndo();
              dismiss(id);
            },
          },
        },
      ]);
      setTimeout(() => dismiss(id), UNDO_AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg shadow-black/30 backdrop-blur ${
              t.variant === "success"
                ? "border-gold/40 bg-navy-card/95 text-gold"
                : "border-red-400/40 bg-navy-card/95 text-red-300"
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={t.action.onClick}
                className="pointer-events-auto rounded-full border border-current px-2.5 py-0.5 text-xs font-bold underline-offset-2 hover:underline"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider.");
  return ctx;
}
