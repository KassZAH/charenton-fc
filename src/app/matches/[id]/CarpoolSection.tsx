"use client";

import { useState } from "react";
import { setCarpoolInfo } from "@/lib/data/carpool-actions";
import { useToast } from "@/components/ui/ToastProvider";
import type { CarpoolSummary, MyCarpoolInfo } from "@/lib/data/carpool";

type CarpoolRole = "none" | "driver" | "rider";

function initialRole(info: MyCarpoolInfo | null): CarpoolRole {
  if (!info) return "none";
  if (info.canDrive) return "driver";
  if (info.needsRide) return "rider";
  return "none";
}

export function CarpoolSection({
  matchId,
  myInfo,
  summary,
}: {
  matchId: string;
  myInfo: MyCarpoolInfo | null;
  summary: CarpoolSummary;
}) {
  const [role, setRole] = useState<CarpoolRole>(initialRole(myInfo));
  const [seats, setSeats] = useState(myInfo?.availableSeats ? String(myInfo.availableSeats) : "");
  const [comment, setComment] = useState(myInfo?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  async function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    setIsPending(true);
    try {
      await setCarpoolInfo(matchId, formData);
      setSaved(true);
      showToast("Covoiturage enregistré ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section id="covoiturage" className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Covoiturage</h2>

      {(summary.drivers.length > 0 || summary.riders.length > 0) && (
        <div className="mb-3 rounded-xl border border-white/10 bg-navy-card p-3 text-sm text-cream/90">
          <p>
            🚗 {summary.drivers.length} conducteur{summary.drivers.length > 1 ? "s" : ""} · {summary.totalSeats}{" "}
            place{summary.totalSeats > 1 ? "s" : ""} disponible{summary.totalSeats > 1 ? "s" : ""}
          </p>
          <p>
            🙋 {summary.riders.length} joueur{summary.riders.length > 1 ? "s" : ""} cherche
            {summary.riders.length > 1 ? "nt" : ""} une place
          </p>
          {summary.riders.length > summary.totalSeats && (
            <p className="mt-1 text-xs font-semibold text-gold">⚠️ Pas assez de places pour tout le monde.</p>
          )}
          {summary.drivers.length > 0 && (
            <p className="mt-2 text-xs text-steel">
              Conducteurs : {summary.drivers.map((d) => `${d.name} (${d.seats})`).join(", ")}
            </p>
          )}
          {summary.riders.length > 0 && (
            <p className="text-xs text-steel">Cherchent une place : {summary.riders.map((r) => r.name).join(", ")}</p>
          )}
        </div>
      )}

      <form action={submit} className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "none", label: "Aucun" },
              { value: "driver", label: "🚗 Je conduis" },
              { value: "rider", label: "🙋 J'ai besoin d'une place" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center justify-center rounded-lg border py-2 text-center text-xs font-semibold ${
                role === opt.value ? "border-gold bg-gold/10 text-gold" : "border-white/15 bg-white/5 text-cream/80"
              }`}
            >
              <input
                type="radio"
                name="carpool_role"
                value={opt.value}
                checked={role === opt.value}
                onChange={() => setRole(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {role === "driver" && (
          <label className="block text-sm text-cream">
            Places disponibles
            <input
              type="number"
              inputMode="numeric"
              name="available_seats"
              min={1}
              max={8}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
            />
          </label>
        )}

        {role === "rider" && (
          <label className="block text-sm text-cream">
            Point de départ (facultatif)
            <input
              type="text"
              name="ride_comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ex. métro Charenton-Écoles"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
            />
          </label>
        )}

        {error && (
          <p className="text-sm font-medium text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep disabled:opacity-60"
        >
          {isPending ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </form>
    </section>
  );
}
