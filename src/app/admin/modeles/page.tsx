import Link from "next/link";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { getMatchTemplates } from "@/lib/data/match-templates";
import { getVenues } from "@/lib/data/venues";
import { createMatchTemplate, deleteMatchTemplate, generateMatchFromTemplate } from "@/lib/data/match-templates-actions";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";

export default async function MatchTemplatesPage() {
  await requireFreshCoach();
  const [templates, venues] = await Promise.all([getMatchTemplates(), getVenues()]);
  const venueNameById = new Map(venues.map((v) => [v.id, v.name]));

  return (
    <ResponsivePageContainer size="full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Modèles de match</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>
      <p className="mb-4 text-xs text-steel/70">
        Un modèle mémorise la structure d&apos;un match habituel (lieu, horaires, type) — jamais les présences, le
        covoiturage, les blessures ou les paiements, qui n&apos;existent pas encore pour un match généré.
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Modèles enregistrés</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-steel/70">Aucun modèle pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-cream">{t.name}</p>
                    <p className="text-xs text-steel/70">
                      {[t.venue_id ? venueNameById.get(t.venue_id) : null, t.match_type, t.kickoff_time?.slice(0, 5)]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <form action={deleteMatchTemplate.bind(null, t.id)}>
                    <button type="submit" className="shrink-0 text-xs font-medium text-steel/60 underline underline-offset-2">
                      Suppr.
                    </button>
                  </form>
                </div>
                <form action={generateMatchFromTemplate.bind(null, t.id)} className="mt-2 flex items-end gap-2">
                  <label className="text-xs text-cream">
                    Générer un match le
                    <input
                      type="date"
                      name="match_date"
                      required
                      className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream"
                    />
                  </label>
                  <button type="submit" className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep">
                    Générer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Nouveau modèle</h2>
        <form action={createMatchTemplate} className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
          <label className="block text-sm text-cream">
            Nom
            <input
              type="text"
              name="name"
              required
              placeholder="ex. Vendredi soir à Charenton"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50"
            />
          </label>

          {venues.length > 0 && (
            <label className="block text-sm text-cream">
              Terrain
              <select name="venue_id" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream">
                <option value="">— Aucun —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm text-cream">
              Coup d&apos;envoi
              <input type="time" name="kickoff_time" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream" />
            </label>
            <label className="block text-sm text-cream">
              RDV (minutes avant)
              <input
                type="number"
                name="meeting_offset_minutes"
                min="0"
                placeholder="ex. 30"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm text-cream">
              Domicile / Extérieur
              <select name="home_or_away" defaultValue="home" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream">
                <option value="home">Domicile</option>
                <option value="away">Extérieur</option>
              </select>
            </label>
            <label className="block text-sm text-cream">
              Type
              <select name="match_type" defaultValue="amical" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream">
                <option value="championnat">Championnat</option>
                <option value="amical">Amical</option>
                <option value="tournoi">Tournoi</option>
                <option value="autre">Autre</option>
              </select>
            </label>
          </div>

          <label className="block text-sm text-cream">
            Nombre maximum de joueurs
            <input type="number" name="max_players" min="1" className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream" />
          </label>

          <label className="block text-sm text-cream">
            Matériel habituel (séparé par des virgules)
            <input
              type="text"
              name="default_equipment_items"
              placeholder="ex. ballons, chasubles, trousse de secours"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50"
            />
          </label>

          <button type="submit" className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
            Créer le modèle
          </button>
        </form>
      </section>
    </ResponsivePageContainer>
  );
}
