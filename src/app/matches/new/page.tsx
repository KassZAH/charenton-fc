import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getOpponents } from "@/lib/data/opponents";
import { getVenues } from "@/lib/data/venues";
import { createMatch } from "@/lib/data/matches-actions";
import { KickoffAndMeetingFields } from "../KickoffAndMeetingFields";
import { VenuePicker } from "../VenuePicker";

export default async function NewMatchPage() {
  await requireAdmin();
  const [opponents, venues] = await Promise.all([getOpponents(), getVenues()]);

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-cream">Nouveau match</h1>
        <Link href="/matches/new-bulk" className="text-xs font-medium text-steel underline underline-offset-2">
          Plusieurs matchs d&apos;un coup →
        </Link>
      </div>

      <form action={createMatch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="opponent_id">
            Adversaire existant
          </label>
          <select
            id="opponent_id"
            name="opponent_id"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
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
          <label className="block text-sm font-medium text-cream" htmlFor="new_opponent_name">
            Ou nouvel adversaire
          </label>
          <input
            id="new_opponent_name"
            type="text"
            name="new_opponent_name"
            placeholder="Nom de l'équipe adverse"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="match_date">
            Date
          </label>
          <input
            id="match_date"
            type="date"
            name="match_date"
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>

        <KickoffAndMeetingFields />

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="response_deadline">
            Date limite de réponse (facultatif)
          </label>
          <input
            id="response_deadline"
            type="datetime-local"
            name="response_deadline"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>

        <VenuePicker venues={venues} />

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="home_or_away">
            Domicile / Extérieur
          </label>
          <select
            id="home_or_away"
            name="home_or_away"
            defaultValue="home"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="home">Domicile</option>
            <option value="away">Extérieur</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="match_type">
            Type
          </label>
          <select
            id="match_type"
            name="match_type"
            defaultValue="championnat"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="championnat">Championnat</option>
            <option value="amical">Amical</option>
            <option value="tournoi">Tournoi</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep"
        >
          Créer le match
        </button>
      </form>
    </div>
  );
}
