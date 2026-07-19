"use client";

import { useState } from "react";
import { setCarpoolInfo, assignCarpoolPassenger, unassignCarpoolPassenger } from "@/lib/data/carpool-actions";
import { whatsappShareUrl } from "@/lib/whatsapp";
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
  isAdmin,
}: {
  matchId: string;
  myInfo: MyCarpoolInfo | null;
  summary: CarpoolSummary;
  isAdmin: boolean;
}) {
  const [role, setRole] = useState<CarpoolRole>(initialRole(myInfo));
  const [seats, setSeats] = useState(myInfo?.availableSeats ? String(myInfo.availableSeats) : "");
  const [comment, setComment] = useState(myInfo?.comment ?? "");
  const [departurePoint, setDeparturePoint] = useState(myInfo?.departurePoint ?? "");
  const [departureTime, setDepartureTime] = useState(myInfo?.departureTime?.slice(0, 5) ?? "");
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

  async function assign(driverPlayerId: string, passengerPlayerId: string) {
    if (!passengerPlayerId) return;
    await assignCarpoolPassenger(matchId, driverPlayerId, passengerPlayerId);
    showToast("Passager affecté ✓");
  }

  async function unassign(passengerPlayerId: string) {
    await unassignCarpoolPassenger(matchId, passengerPlayerId);
    showToast("Affectation retirée ✓");
  }

  return (
    <section id="covoiturage" className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Covoiturage</h2>

      {(summary.drivers.length > 0 || summary.unassignedRiders.length > 0) && (
        <div className="mb-3 space-y-2">
          <div className="rounded-xl border border-white/10 bg-navy-card p-3 text-sm text-cream/90">
            <p>
              🚗 {summary.drivers.length} conducteur{summary.drivers.length > 1 ? "s" : ""} · {summary.totalRemainingSeats}{" "}
              place{summary.totalRemainingSeats > 1 ? "s" : ""} restante{summary.totalRemainingSeats > 1 ? "s" : ""} sur{" "}
              {summary.totalSeats}
            </p>
            {summary.hasDeficit && (
              <p className="mt-1 text-xs font-semibold text-gold">⚠️ Pas assez de places pour tout le monde.</p>
            )}
          </div>

          {summary.drivers.map((d) => (
            <div key={d.playerId} className="rounded-xl border border-white/10 bg-navy-card p-3 text-sm text-cream">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  🚗 {d.name} — {d.remainingSeats}/{d.seats} place{d.seats > 1 ? "s" : ""} restante{d.seats > 1 ? "s" : ""}
                </span>
              </div>
              {(d.departurePoint || d.departureTime) && (
                <p className="mt-0.5 text-xs text-steel/70">
                  Départ {d.departureTime ? `à ${d.departureTime.slice(0, 5)}` : ""} {d.departurePoint ?? ""}
                </p>
              )}
              {d.assignedPassengers.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {d.assignedPassengers.map((p) => (
                    <li key={p.playerId} className="flex items-center justify-between text-xs text-cream/80">
                      <span>🙋 {p.name}</span>
                      <span className="flex items-center gap-2">
                        <a
                          href={whatsappShareUrl(`Salut ${p.name}, c'est ${d.name} pour le covoiturage du match — je te prends en charge.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gold underline underline-offset-2"
                        >
                          Contacter
                        </a>
                        {isAdmin && (
                          <button type="button" onClick={() => unassign(p.playerId)} className="text-steel/60 underline underline-offset-2">
                            Retirer
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin && d.remainingSeats > 0 && summary.unassignedRiders.length > 0 && (
                <form
                  action={(fd) => assign(d.playerId, String(fd.get("passenger_id") ?? ""))}
                  className="mt-2 flex items-center gap-2"
                >
                  <select name="passenger_id" className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-cream">
                    <option value="">— Affecter un passager —</option>
                    {summary.unassignedRiders.map((r) => (
                      <option key={r.playerId} value={r.playerId}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-navy-deep">
                    Affecter
                  </button>
                </form>
              )}
            </div>
          ))}

          {summary.unassignedRiders.length > 0 && (
            <p className="text-xs text-steel">
              Cherchent une place : {summary.unassignedRiders.map((r) => r.name).join(", ")}
            </p>
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
          <>
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
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm text-cream">
                Point de départ
                <input
                  type="text"
                  name="departure_point"
                  value={departurePoint}
                  onChange={(e) => setDeparturePoint(e.target.value)}
                  placeholder="ex. métro Charenton-Écoles"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
                />
              </label>
              <label className="block text-sm text-cream">
                Heure de départ
                <input
                  type="time"
                  name="departure_time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
                />
              </label>
            </div>
          </>
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
