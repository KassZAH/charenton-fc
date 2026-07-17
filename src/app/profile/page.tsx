import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/current-user";
import { getPlayerById } from "@/lib/data/players";
import { getPlayerMeasurements } from "@/lib/data/measurements";
import { updateOwnProfile } from "@/lib/data/players-actions";
import { addMeasurement, deleteMeasurement, setShareMeasurements } from "@/lib/data/measurements-actions";
import { resetSeasonData } from "@/lib/data/reset-actions";
import { getActiveInjury, getPlayerInjuryHistory } from "@/lib/data/injuries";
import { formatShortDate } from "@/lib/format";
import { ResetButton } from "./ResetButton";
import { InjuryPanel } from "./InjuryPanel";
import { CalendarSubscribeLink } from "./CalendarSubscribeLink";

export default async function ProfilePage() {
  const user = await requireUser();
  const player = await getPlayerById(user.playerId);
  if (!player) notFound();

  const [measurements, activeInjury, injuryHistory, headerList] = await Promise.all([
    getPlayerMeasurements(player.id),
    getActiveInjury(player.id),
    getPlayerInjuryHistory(player.id),
    headers(),
  ]);
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const calendarUrl = `${protocol}://${host}/calendar/${player.calendar_token}`;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-extrabold text-cream">Mon profil</h1>

      <form action={updateOwnProfile} className="space-y-4">
        <Field label="Prénom" name="first_name" defaultValue={player.first_name} required />
        <Field label="Nom" name="last_name" defaultValue={player.last_name ?? ""} />
        <Field label="Surnom" name="nickname" defaultValue={player.nickname ?? ""} />

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="primary_position">
            Poste
          </label>
          <select
            id="primary_position"
            name="primary_position"
            defaultValue={player.primary_position ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="">—</option>
            <option value="Gardien">Gardien</option>
            <option value="Défenseur">Défenseur</option>
            <option value="Milieu">Milieu</option>
            <option value="Attaquant">Attaquant</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="strong_foot">
            Pied fort
          </label>
          <select
            id="strong_foot"
            name="strong_foot"
            defaultValue={player.strong_foot ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="">—</option>
            <option value="Gauche">Gauche</option>
            <option value="Droit">Droit</option>
            <option value="Les deux">Les deux</option>
          </select>
        </div>

        <Field label="Citation" name="quote" defaultValue={player.quote ?? ""} />

        <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
          Enregistrer
        </button>
      </form>

      <p className="mt-2 text-xs text-steel/70">
        Numéro de maillot, rôle et PIN sont gérés par l&apos;admin de l&apos;équipe.
      </p>

      <section className="mt-8 border-t border-white/10 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-cream">Mes mesures</h2>
          <form action={setShareMeasurements.bind(null, !player.share_measurements)}>
            <button
              type="submit"
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-cream/80"
            >
              {player.share_measurements ? "Partagées avec l'équipe" : "Privées"}
            </button>
          </form>
        </div>
        <p className="mb-4 text-xs text-steel/70">
          {player.share_measurements
            ? "Tes coéquipiers peuvent voir ta dernière mesure sur ta fiche."
            : "Seuls toi et les admins peuvent voir tes mesures."}
        </p>

        <form action={addMeasurement} className="mb-4 flex items-end gap-2">
          <label className="flex-1 text-sm text-cream">
            Poids (kg)
            <input
              type="number"
              step="0.1"
              name="weight_kg"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
            />
          </label>
          <label className="flex-1 text-sm text-cream">
            Taille (cm)
            <input
              type="number"
              step="0.1"
              name="height_cm"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
            />
          </label>
          <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
            Ajouter
          </button>
        </form>

        {measurements.length === 0 ? (
          <p className="text-sm text-steel/70">Aucune mesure enregistrée pour le moment.</p>
        ) : (
          <ul className="space-y-1.5">
            {measurements.map((m, i) => {
              const prev = measurements[i + 1];
              const weightDelta =
                prev?.weight_kg != null && m.weight_kg != null
                  ? Math.round((m.weight_kg - prev.weight_kg) * 10) / 10
                  : null;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2"
                >
                  <span className="text-xs text-steel/70">{formatShortDate(m.recorded_at)}</span>
                  <span className="text-sm text-cream">
                    {m.weight_kg != null && `${m.weight_kg} kg`}
                    {weightDelta != null && weightDelta !== 0 && (
                      <span className={weightDelta > 0 ? "text-red-400" : "text-emerald-400"}>
                        {" "}
                        ({weightDelta > 0 ? "+" : ""}
                        {weightDelta})
                      </span>
                    )}
                    {m.height_cm != null && ` · ${m.height_cm} cm`}
                  </span>
                  <form action={deleteMeasurement.bind(null, m.id)}>
                    <button type="submit" className="text-xs font-medium text-steel/60">
                      Suppr.
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold text-cream">Calendrier</h2>
        <CalendarSubscribeLink url={calendarUrl} />
      </section>

      <InjuryPanel activeInjury={activeInjury} history={injuryHistory} />

      {player.first_name === "Amine" && (
        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="mb-2 text-sm font-semibold text-red-400">Zone dangereuse</h2>
          <p className="mb-3 text-xs text-steel/70">
            Supprime définitivement tous les matchs, buts, cartons, présences, votes et badges.
            L&apos;effectif et les adversaires restent intacts.
          </p>
          <form action={resetSeasonData}>
            <ResetButton />
          </form>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-cream" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
      />
    </div>
  );
}
