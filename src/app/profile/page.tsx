import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getPlayerById } from "@/lib/data/players";
import { getPlayerMeasurements } from "@/lib/data/measurements";
import { updateOwnProfile } from "@/lib/data/players-actions";
import { addMeasurement, deleteMeasurement, setShareMeasurements } from "@/lib/data/measurements-actions";
import { formatShortDate } from "@/lib/format";

export default async function ProfilePage() {
  const user = await requireUser();
  const player = await getPlayerById(user.playerId);
  if (!player) notFound();

  const measurements = await getPlayerMeasurements(player.id);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-navy">Mon profil</h1>

      <form action={updateOwnProfile} className="space-y-4">
        <Field label="Prénom" name="first_name" defaultValue={player.first_name} required />
        <Field label="Nom" name="last_name" defaultValue={player.last_name ?? ""} />
        <Field label="Surnom" name="nickname" defaultValue={player.nickname ?? ""} />

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="primary_position">
            Poste
          </label>
          <select
            id="primary_position"
            name="primary_position"
            defaultValue={player.primary_position ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="">—</option>
            <option value="Gardien">Gardien</option>
            <option value="Défenseur">Défenseur</option>
            <option value="Milieu">Milieu</option>
            <option value="Attaquant">Attaquant</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="strong_foot">
            Pied fort
          </label>
          <select
            id="strong_foot"
            name="strong_foot"
            defaultValue={player.strong_foot ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="">—</option>
            <option value="Gauche">Gauche</option>
            <option value="Droit">Droit</option>
            <option value="Les deux">Les deux</option>
          </select>
        </div>

        <Field label="Citation" name="quote" defaultValue={player.quote ?? ""} />

        <button type="submit" className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold">
          Enregistrer
        </button>
      </form>

      <p className="mt-2 text-xs text-navy/50">
        Numéro de maillot, rôle et PIN sont gérés par l&apos;admin de l&apos;équipe.
      </p>

      <section className="mt-8 border-t border-navy/10 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy">Mes mesures</h2>
          <form action={setShareMeasurements.bind(null, !player.share_measurements)}>
            <button
              type="submit"
              className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/70"
            >
              {player.share_measurements ? "Partagées avec l'équipe" : "Privées"}
            </button>
          </form>
        </div>
        <p className="mb-4 text-xs text-navy/50">
          {player.share_measurements
            ? "Tes coéquipiers peuvent voir ta dernière mesure sur ta fiche."
            : "Seuls toi et les admins peuvent voir tes mesures."}
        </p>

        <form action={addMeasurement} className="mb-4 flex items-end gap-2">
          <label className="flex-1 text-sm text-navy">
            Poids (kg)
            <input
              type="number"
              step="0.1"
              name="weight_kg"
              className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
            />
          </label>
          <label className="flex-1 text-sm text-navy">
            Taille (cm)
            <input
              type="number"
              step="0.1"
              name="height_cm"
              className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-gold">
            Ajouter
          </button>
        </form>

        {measurements.length === 0 ? (
          <p className="text-sm text-navy/50">Aucune mesure enregistrée pour le moment.</p>
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
                  className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-3 py-2"
                >
                  <span className="text-xs text-navy/50">{formatShortDate(m.recorded_at)}</span>
                  <span className="text-sm text-navy">
                    {m.weight_kg != null && `${m.weight_kg} kg`}
                    {weightDelta != null && weightDelta !== 0 && (
                      <span className={weightDelta > 0 ? "text-red-500" : "text-emerald-600"}>
                        {" "}
                        ({weightDelta > 0 ? "+" : ""}
                        {weightDelta})
                      </span>
                    )}
                    {m.height_cm != null && ` · ${m.height_cm} cm`}
                  </span>
                  <form action={deleteMeasurement.bind(null, m.id)}>
                    <button type="submit" className="text-xs font-medium text-navy/40">
                      Suppr.
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
      <label className="block text-sm font-medium text-navy" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
      />
    </div>
  );
}
