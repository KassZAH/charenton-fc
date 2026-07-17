import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getOpponents } from "@/lib/data/opponents";
import { updateMatchDetails, deleteMatch } from "@/lib/data/matches-actions";
import { KickoffAndMeetingFields } from "../../KickoffAndMeetingFields";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const [match, opponents] = await Promise.all([getMatchById(id), getOpponents()]);
  if (!match) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-extrabold text-cream">Modifier le match</h1>

      <form action={updateMatchDetails.bind(null, match.id)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="opponent_id">
            Adversaire existant
          </label>
          <select
            id="opponent_id"
            name="opponent_id"
            defaultValue={match.opponent_id ?? ""}
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
            defaultValue={match.match_date}
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>

        <KickoffAndMeetingFields
          initialKickoff={match.kickoff_time?.slice(0, 5) ?? ""}
          initialMeeting={match.meeting_time?.slice(0, 5) ?? ""}
        />

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="location">
            Lieu
          </label>
          <input
            id="location"
            type="text"
            name="location"
            defaultValue={match.location ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-cream" htmlFor="address">
              Adresse
            </label>
            <input
              id="address"
              type="text"
              name="address"
              defaultValue={match.address ?? ""}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream" htmlFor="maps_url">
              Lien Google Maps
            </label>
            <input
              id="maps_url"
              type="url"
              name="maps_url"
              defaultValue={match.maps_url ?? ""}
              placeholder="https://maps.google.com/..."
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="home_or_away">
            Domicile / Extérieur
          </label>
          <select
            id="home_or_away"
            name="home_or_away"
            defaultValue={match.home_or_away ?? "home"}
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
            defaultValue={match.match_type ?? "championnat"}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="championnat">Championnat</option>
            <option value="amical">Amical</option>
            <option value="tournoi">Tournoi</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="description">
            Anecdote du match
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={match.description ?? ""}
            placeholder="Un truc marrant/mémorable à retenir de ce match..."
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep"
        >
          Enregistrer
        </button>
      </form>

      <form action={deleteMatch.bind(null, match.id)} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-lg border border-red-400/30 py-3 text-sm font-semibold text-red-300"
        >
          Supprimer ce match
        </button>
      </form>
    </div>
  );
}
