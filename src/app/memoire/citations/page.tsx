import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getClubQuotes } from "@/lib/data/club-memory";
import { addClubQuote, deleteClubQuote } from "@/lib/data/club-memory-actions";
import { getActivePlayers } from "@/lib/data/players";
import { isElevatedRole } from "@/types/models";
import { PlayerSelect } from "@/components/ui/PlayerSelect";

export default async function CitationsPage() {
  const user = await requireUser();
  const isAdmin = isElevatedRole(user.role);

  const [quotes, players] = await Promise.all([getClubQuotes(), isAdmin ? getActivePlayers() : Promise.resolve([])]);
  const playerOptions = players.map((p) => ({ id: p.id, name: p.nickname || p.first_name }));

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Mur des citations</h1>
        <Link href="/memoire" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Mémoire
        </Link>
      </div>

      {quotes.length === 0 ? (
        <p className="text-sm text-steel/70">Aucune citation pour le moment.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {quotes.map((q) => (
            <li key={q.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
              <p className="text-sm italic text-cream">« {q.quote_text} »</p>
              {(q.playerName || q.author_label) && (
                <p className="mt-1 text-xs text-steel/70">— {q.playerName || q.author_label}</p>
              )}
              {isAdmin && (
                <form action={deleteClubQuote.bind(null, q.id)} className="mt-2">
                  <button type="submit" className="text-xs font-medium text-steel/60">
                    Suppr.
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <section className="border-t border-white/10 pt-6">
          <h2 className="mb-3 text-sm font-bold text-cream">Ajouter une citation</h2>
          <form action={addClubQuote} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="quote_text">
                Citation
              </label>
              <textarea
                id="quote_text"
                name="quote_text"
                rows={3}
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
            <PlayerSelect players={playerOptions} label="Joueur (si applicable)" name="player_id" id="player_id" />
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="author_label">
                Contexte / auteur libre
              </label>
              <input
                id="author_label"
                type="text"
                name="author_label"
                placeholder="Ex. après la victoire 3-1 vs Ivry"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
              Ajouter
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
