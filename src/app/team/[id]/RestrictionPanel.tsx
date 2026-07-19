"use client";

import { useState, useTransition } from "react";
import { createPlayerRestriction, endPlayerRestriction } from "@/lib/data/player-restrictions-actions";
import { formatShortDateOnly, formatShortDate } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";
import { RESTRICTION_TYPE_LABELS, type PlayerRestriction, type RestrictionType } from "@/types/models";

const TYPE_OPTIONS = Object.entries(RESTRICTION_TYPE_LABELS) as [RestrictionType, string][];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Privé (joueur seulement)" },
  { value: "coaches", label: "Coachs seulement" },
  { value: "team", label: "Visible à l'équipe" },
];

/**
 * Réservé au coach (créée/clôturée par requireFreshCoach côté serveur) — jamais d'auto-déclaration
 * comme les blessures (Lot 19, roadmap V3). `canViewActive` détermine si le joueur/viewer actuel peut
 * voir le détail de la restriction active selon sa visibilité (calculé côté serveur, jamais côté client).
 */
export function RestrictionPanel({
  playerId,
  activeRestriction,
  history,
  isAdmin,
  canViewActive,
}: {
  playerId: string;
  activeRestriction: PlayerRestriction | null;
  history: PlayerRestriction[];
  isAdmin: boolean;
  canViewActive: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const pastRestrictions = history.filter((r) => r.status !== "active");

  if (!isAdmin && !activeRestriction) return null;
  if (!isAdmin && activeRestriction && !canViewActive) return null;

  function endRestriction() {
    if (!activeRestriction) return;
    startTransition(async () => {
      await endPlayerRestriction(activeRestriction.id);
      showToast("Restriction clôturée ✓");
    });
  }

  async function submitCreate(formData: FormData) {
    setError(null);
    try {
      await createPlayerRestriction(playerId, formData);
      setCreateOpen(false);
      showToast("Restriction créée ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-navy-card p-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Restriction / reprise progressive</h2>

      {activeRestriction && canViewActive && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-cream">
          <p className="font-semibold">
            {activeRestriction.restriction_types.map((t) => RESTRICTION_TYPE_LABELS[t]).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-steel/70">
            Depuis le {formatShortDateOnly(activeRestriction.starts_at)}
            {activeRestriction.ends_at && ` — jusqu'au ${formatShortDateOnly(activeRestriction.ends_at)}`}
          </p>
          {activeRestriction.comment && <p className="mt-1 text-xs italic text-steel/70">{activeRestriction.comment}</p>}
          {isAdmin && (
            <button
              type="button"
              onClick={endRestriction}
              disabled={isPending}
              className="mt-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80 disabled:opacity-60"
            >
              Clôturer la restriction
            </button>
          )}
        </div>
      )}

      {isAdmin && !activeRestriction && !createOpen && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80"
        >
          + Créer une restriction
        </button>
      )}

      {isAdmin && createOpen && (
        <form action={submitCreate} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-cream">Types</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPE_OPTIONS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5 text-xs text-cream">
                  <input type="checkbox" name="restriction_types" value={value} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-cream">
              Début
              <input
                type="date"
                name="starts_at"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream"
              />
            </label>
            <label className="text-xs text-cream">
              Fin (facultatif)
              <input type="date" name="ends_at" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream" />
            </label>
          </div>
          <label className="block text-xs text-cream">
            Commentaire (facultatif, jamais un détail médical)
            <input
              type="text"
              name="comment"
              placeholder="ex. reprise progressive après arrêt"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50"
            />
          </label>
          <label className="block text-xs text-cream">
            Visibilité
            <select
              name="visibility"
              defaultValue="coaches"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="text-sm font-medium text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
              Créer
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-cream/80"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {isAdmin && pastRestrictions.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-steel">Historique</h3>
          <ul className="space-y-1.5">
            {pastRestrictions.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-steel">
                {r.restriction_types.map((t) => RESTRICTION_TYPE_LABELS[t]).join(" · ")} —{" "}
                {formatShortDateOnly(r.starts_at)}
                {/* ended_at est un timestamptz complet (moment de clôture), pas une colonne `date`
                    comme starts_at/ends_at — formatShortDateOnly y ajoutait "T00:00:00" en double,
                    produisant "Invalid Date" (trouvé par le gate E2E de fin de macro-release). */}
                {r.ended_at && ` → ${formatShortDate(r.ended_at)}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
