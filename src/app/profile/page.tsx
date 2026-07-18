import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/current-user";
import { getPlayerById } from "@/lib/data/players";
import { getPlayerMeasurements } from "@/lib/data/measurements";
import { updateOwnProfile, updatePrivacySettings } from "@/lib/data/players-actions";
import { addMeasurement, deleteMeasurement } from "@/lib/data/measurements-actions";
import { getPlayerGoals } from "@/lib/data/player-goals";
import { addPlayerGoal, toggleGoalAchieved, deletePlayerGoal } from "@/lib/data/player-goals-actions";
import { resetSeasonData } from "@/lib/data/reset-actions";
import { getActiveSeason } from "@/lib/data/seasons";
import { getActiveInjury, getPlayerInjuryHistory } from "@/lib/data/injuries";
import { formatShortDate } from "@/lib/format";
import { isElevatedRole } from "@/types/models";
import { ResetButton } from "./ResetButton";
import { InjuryPanel } from "./InjuryPanel";
import { CalendarSubscribeLink } from "./CalendarSubscribeLink";

const VISIBILITY_LABELS: Record<string, string> = {
  private: "Privé",
  coach: "Coachs seulement",
  team: "Équipe",
  public: "Public",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const player = await getPlayerById(user.playerId);
  if (!player) notFound();

  const isAdmin = isElevatedRole(user.role);

  const [measurements, activeInjury, injuryHistory, goals, headerList, activeSeason] = await Promise.all([
    getPlayerMeasurements(player.id),
    getActiveInjury(player.id),
    getPlayerInjuryHistory(player.id),
    getPlayerGoals(player.id),
    headers(),
    isAdmin ? getActiveSeason() : Promise.resolve(null),
  ]);
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const calendarUrl = `${protocol}://${host}/calendar/${player.calendar_token}`;
  const publicProfileUrl = `${protocol}://${host}/profil/${player.public_token}`;

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

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="birthday">
            Anniversaire
          </label>
          <input
            id="birthday"
            type="date"
            name="birthday"
            defaultValue={player.birthday ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="photo_url">
            Lien vers une photo (facultatif)
          </label>
          <input
            id="photo_url"
            type="url"
            name="photo_url"
            defaultValue={player.photo_url ?? ""}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </div>

        <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
          Enregistrer
        </button>
      </form>

      <p className="mt-2 text-xs text-steel/70">
        Numéro de maillot, rôle et PIN sont gérés par l&apos;admin de l&apos;équipe.
      </p>

      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-1 text-sm font-bold text-cream">Centre de confidentialité</h2>
        <p className="mb-3 text-xs text-steel/70">
          Qui peut voir chaque info. Toi et les admins/coachs voyez toujours tout.
        </p>
        <form action={updatePrivacySettings} className="space-y-3">
          <VisibilitySelect name="photo_visibility" label="Photo" defaultValue={player.photo_visibility} />
          <VisibilitySelect name="birthday_visibility" label="Anniversaire" defaultValue={player.birthday_visibility} />
          <VisibilitySelect
            name="measurements_visibility"
            label="Taille / poids"
            defaultValue={player.measurements_visibility}
          />
          <label className="flex items-center gap-2 text-sm text-cream">
            <input type="checkbox" name="public_profile_enabled" defaultChecked={player.public_profile_enabled} />
            Activer mon profil public (partageable hors de l&apos;appli)
          </label>
          <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
            Enregistrer
          </button>
        </form>
        {player.public_profile_enabled && (
          <p className="mt-2 truncate text-xs text-steel/70">
            Lien public : <span className="text-gold">{publicProfileUrl}</span>
          </p>
        )}
      </section>

      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold text-cream">Objectifs personnels</h2>
        <form action={addPlayerGoal} className="mb-4 space-y-2">
          <input
            type="text"
            name="title"
            placeholder="Ex. Marquer 10 buts cette saison"
            required
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
          <div className="flex gap-2">
            <select
              name="visibility"
              defaultValue="private"
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
            >
              <option value="private">Privé</option>
              <option value="coach">Coachs seulement</option>
              <option value="team">Équipe</option>
            </select>
            <button type="submit" className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
              Ajouter
            </button>
          </div>
        </form>

        {goals.length === 0 ? (
          <p className="text-sm text-steel/70">Aucun objectif pour le moment.</p>
        ) : (
          <ul className="space-y-1.5">
            {goals.map((g) => (
              <li key={g.id} className="rounded-xl border border-white/10 bg-navy-card px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${g.achieved ? "text-steel/60 line-through" : "text-cream"}`}>
                    {g.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-steel/60">{VISIBILITY_LABELS[g.visibility]}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <form action={toggleGoalAchieved.bind(null, g.id, !g.achieved)}>
                    <button type="submit" className="text-xs font-medium text-gold">
                      {g.achieved ? "Marquer non atteint" : "Marquer atteint"}
                    </button>
                  </form>
                  <form action={deletePlayerGoal.bind(null, g.id)}>
                    <button type="submit" className="text-xs font-medium text-steel/60">
                      Suppr.
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold text-cream">Mes mesures</h2>

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

      {isAdmin && activeSeason && (
        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="mb-2 text-sm font-semibold text-red-400">Zone dangereuse</h2>
          <p className="mb-3 text-xs text-steel/70">
            Supprime définitivement les matchs, buts, cartons, présences et votes de la saison active
            (« {activeSeason.name} ») uniquement — les autres saisons ne sont pas touchées. L&apos;effectif et les
            adversaires restent intacts. Une sauvegarde est créée automatiquement avant (voir Admin &gt;
            Sauvegardes).
          </p>
          <form action={resetSeasonData}>
            <ResetButton seasonName={activeSeason.name} />
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

function VisibilitySelect({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-sm text-cream" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream focus:border-gold/50 focus:outline-none"
      >
        <option value="private">Privé</option>
        <option value="coach">Coachs</option>
        <option value="team">Équipe</option>
        <option value="public">Public</option>
      </select>
    </div>
  );
}
