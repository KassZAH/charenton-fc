"use client";

import { useState, useTransition } from "react";
import {
  declareInjury,
  recoverFromInjury,
  cancelInjury,
  updateInjuryReturnDate,
} from "@/lib/data/injuries-actions";
import { formatShortDateOnly } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";
import type { Injury, InjuryDurationPreset } from "@/types/models";

const DURATION_OPTIONS: { value: InjuryDurationPreset; label: string }[] = [
  { value: "next_match", label: "Seulement le prochain match" },
  { value: "1_week", label: "Environ 1 semaine" },
  { value: "2_weeks", label: "Environ 2 semaines" },
  { value: "1_month", label: "Environ 1 mois" },
  { value: "custom_date", label: "Jusqu'à une date précise" },
  { value: "unknown", label: "Durée inconnue" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Privé" },
  { value: "coach", label: "Visible aux coachs" },
  { value: "team", label: "Visible à l'équipe" },
];

function DurationFields({ idPrefix }: { idPrefix: string }) {
  const [preset, setPreset] = useState<InjuryDurationPreset>("unknown");
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-cream" htmlFor={`${idPrefix}-preset`}>
          Durée approximative
        </label>
        <select
          id={`${idPrefix}-preset`}
          name="duration_preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value as InjuryDurationPreset)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {preset === "custom_date" && (
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor={`${idPrefix}-custom-date`}>
            Date de retour
          </label>
          <input
            id={`${idPrefix}-custom-date`}
            type="date"
            name="custom_date"
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>
      )}
    </>
  );
}

export function InjuryPanel({ activeInjury, history }: { activeInjury: Injury | null; history: Injury[] }) {
  const [declareOpen, setDeclareOpen] = useState(false);
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const pastInjuries = history.filter((i) => i.status !== "active");
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = !!activeInjury?.estimated_return_date && activeInjury.estimated_return_date < today;

  function recover() {
    startTransition(async () => {
      await recoverFromInjury();
      showToast("Te revoilà d'attaque ✓");
    });
  }

  function cancel() {
    startTransition(async () => {
      await cancelInjury();
      showToast("Blessure annulée ✓");
    });
  }

  async function submitDeclare(formData: FormData) {
    setError(null);
    try {
      await declareInjury(formData);
      setDeclareOpen(false);
      showToast("Blessure déclarée ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  async function submitEditDate(formData: FormData) {
    setError(null);
    try {
      await updateInjuryReturnDate(formData);
      setEditDateOpen(false);
      showToast("Date de retour mise à jour ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Blessure</h2>

      {activeInjury ? (
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-3 ${
              isOverdue ? "border-gold/30 bg-gold/5" : "border-white/10 bg-navy-card"
            }`}
          >
            <p className="text-sm text-cream">
              🩹 Blessé depuis le {formatShortDateOnly(activeInjury.started_at)}
              {activeInjury.estimated_return_date
                ? ` — retour estimé le ${formatShortDateOnly(activeInjury.estimated_return_date)}`
                : " — durée inconnue"}
            </p>
            {activeInjury.comment && <p className="mt-1 text-xs text-steel">{activeInjury.comment}</p>}
            {isOverdue && (
              <p className="mt-2 text-xs font-semibold text-gold">
                Ton retour était estimé au {formatShortDateOnly(activeInjury.estimated_return_date!)}. Es-tu
                toujours blessé ?
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={recover}
              disabled={isPending}
              className="rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep disabled:opacity-60"
            >
              ✅ Je suis rétabli
            </button>
            <button
              type="button"
              onClick={() => setEditDateOpen((v) => !v)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80"
            >
              ✏️ Modifier la date de retour
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={isPending}
              className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 disabled:opacity-60"
            >
              Déclarée par erreur
            </button>
          </div>

          {editDateOpen && (
            <form action={submitEditDate} className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
              <DurationFields idPrefix="edit" />
              {error && (
                <p className="text-sm font-medium text-red-400" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
                Mettre à jour
              </button>
            </form>
          )}
        </div>
      ) : declareOpen ? (
        <form action={submitDeclare} className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
          <DurationFields idPrefix="declare" />
          <div>
            <label className="block text-sm font-medium text-cream" htmlFor="comment">
              Commentaire (facultatif)
            </label>
            <input
              id="comment"
              type="text"
              name="comment"
              placeholder="ex. douleur au genou"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream" htmlFor="comment_visibility">
              Visibilité du commentaire
            </label>
            <select
              id="comment_visibility"
              name="comment_visibility"
              defaultValue="team"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm font-medium text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
              Déclarer
            </button>
            <button
              type="button"
              onClick={() => setDeclareOpen(false)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-cream/80"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setDeclareOpen(true)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80"
        >
          🩹 Je suis blessé
        </button>
      )}

      {pastInjuries.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Historique</h3>
          <ul className="space-y-1.5">
            {pastInjuries.map((injury) => (
              <li
                key={injury.id}
                className="rounded-lg border border-white/10 bg-navy-card px-3 py-2 text-xs text-steel"
              >
                {injury.status === "cancelled" ? (
                  <>Blessure annulée — déclarée le {formatShortDateOnly(injury.started_at)}</>
                ) : (
                  <>
                    {formatShortDateOnly(injury.started_at)}
                    {injury.actual_return_date && ` → ${formatShortDateOnly(injury.actual_return_date)}`}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
