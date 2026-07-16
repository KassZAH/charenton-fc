import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getOpponents } from "@/lib/data/opponents";
import { updateMatchDetails, deleteMatch } from "@/lib/data/matches-actions";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const [match, opponents] = await Promise.all([getMatchById(id), getOpponents()]);
  if (!match) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-navy">Modifier le match</h1>

      <form action={updateMatchDetails.bind(null, match.id)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="opponent_id">
            Adversaire existant
          </label>
          <select
            id="opponent_id"
            name="opponent_id"
            defaultValue={match.opponent_id ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="">— Choisir —</option>
            {opponents.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="new_opponent_name">
            Ou nouvel adversaire
          </label>
          <input
            id="new_opponent_name"
            type="text"
            name="new_opponent_name"
            placeholder="Nom de l'équipe adverse"
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-navy" htmlFor="match_date">
              Date
            </label>
            <input
              id="match_date"
              type="date"
              name="match_date"
              defaultValue={match.match_date}
              required
              className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy" htmlFor="kickoff_time">
              Heure
            </label>
            <input
              id="kickoff_time"
              type="time"
              name="kickoff_time"
              defaultValue={match.kickoff_time?.slice(0, 5) ?? ""}
              className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="location">
            Lieu
          </label>
          <input
            id="location"
            type="text"
            name="location"
            defaultValue={match.location ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="home_or_away">
            Domicile / Extérieur
          </label>
          <select
            id="home_or_away"
            name="home_or_away"
            defaultValue={match.home_or_away ?? "home"}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="home">Domicile</option>
            <option value="away">Extérieur</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="match_type">
            Type
          </label>
          <select
            id="match_type"
            name="match_type"
            defaultValue={match.match_type ?? "championnat"}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="championnat">Championnat</option>
            <option value="amical">Amical</option>
            <option value="coupe">Coupe</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold"
        >
          Enregistrer
        </button>
      </form>

      <form action={deleteMatch.bind(null, match.id)} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-lg border border-red-200 py-3 text-sm font-semibold text-red-600"
        >
          Supprimer ce match
        </button>
      </form>
    </div>
  );
}
