import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getJerseyHistoryEntries } from "@/lib/data/club-memory";
import { addJerseyHistoryEntry, deleteJerseyHistoryEntry } from "@/lib/data/club-memory-actions";
import { isElevatedRole } from "@/types/models";

export default async function MaillotsPage() {
  const user = await requireUser();
  const isAdmin = isElevatedRole(user.role);

  const entries = await getJerseyHistoryEntries();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Historique des maillots</h1>
        <Link href="/memoire" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Mémoire
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-steel/70">Aucun maillot enregistré pour le moment.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
              {e.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.image_url}
                  alt={`Maillot ${e.season_label}`}
                  className="mb-2 max-h-48 w-full rounded-lg object-contain"
                />
              )}
              <p className="text-sm font-bold text-gold">{e.season_label}</p>
              {e.description && <p className="text-sm text-cream/80">{e.description}</p>}
              {isAdmin && (
                <form action={deleteJerseyHistoryEntry.bind(null, e.id)} className="mt-2">
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
          <h2 className="mb-3 text-sm font-bold text-cream">Ajouter un maillot</h2>
          <form action={addJerseyHistoryEntry} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="season_label">
                Saison
              </label>
              <input
                id="season_label"
                type="text"
                name="season_label"
                placeholder="Ex. 2024-2025"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="image_url">
                Lien vers une photo (facultatif)
              </label>
              <input
                id="image_url"
                type="url"
                name="image_url"
                placeholder="https://..."
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
