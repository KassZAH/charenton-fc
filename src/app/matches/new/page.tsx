import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getOpponents } from "@/lib/data/opponents";
import { createMatch } from "@/lib/data/matches-actions";

export default async function NewMatchPage() {
  await requireAdmin();
  const opponents = await getOpponents();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy">Nouveau match</h1>
        <Link href="/matches/new-bulk" className="text-xs font-medium text-navy/60 underline underline-offset-2">
          Plusieurs matchs d&apos;un coup →
        </Link>
      </div>

      <form action={createMatch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="opponent_id">
            Adversaire existant
          </label>
          <select
            id="opponent_id"
            name="opponent_id"
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
            defaultValue="home"
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
            defaultValue="championnat"
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="championnat">Championnat</option>
            <option value="amical">Amical</option>
            <option value="tournoi">Tournoi</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold"
        >
          Créer le match
        </button>
      </form>
    </div>
  );
}
