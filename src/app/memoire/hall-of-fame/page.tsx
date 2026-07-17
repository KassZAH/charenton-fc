import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getHallOfFameEntries } from "@/lib/data/club-memory";
import { addHallOfFameEntry, deleteHallOfFameEntry } from "@/lib/data/club-memory-actions";
import { getActivePlayers } from "@/lib/data/players";
import { formatShortDateOnly } from "@/lib/format";
import { isElevatedRole, HALL_OF_FAME_CATEGORY_LABELS } from "@/types/models";
import { PlayerSelect } from "@/components/ui/PlayerSelect";

export default async function HallOfFamePage() {
  const user = await requireUser();
  const isAdmin = isElevatedRole(user.role);

  const [entries, players] = await Promise.all([getHallOfFameEntries(), isAdmin ? getActivePlayers() : Promise.resolve([])]);
  const playerOptions = players.map((p) => ({ id: p.id, name: p.nickname || p.first_name }));

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Hall of Fame</h1>
        <Link href="/memoire" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Mémoire
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-steel/70">Aucune intronisation pour le moment.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-gold/15 bg-navy-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-cream">{e.display_name || e.playerName}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-gold">
                    {HALL_OF_FAME_CATEGORY_LABELS[e.category as keyof typeof HALL_OF_FAME_CATEGORY_LABELS] ?? e.category}
                    {e.retired_number != null && ` · #${e.retired_number} retiré`}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-steel/70">{formatShortDateOnly(e.inducted_at)}</p>
              </div>
              {e.description && <p className="mt-1 text-sm text-cream/80">{e.description}</p>}
              {isAdmin && (
                <form action={deleteHallOfFameEntry.bind(null, e.id)} className="mt-2">
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
          <h2 className="mb-3 text-sm font-bold text-cream">Introniser</h2>
          <form action={addHallOfFameEntry} className="space-y-3">
            <PlayerSelect players={playerOptions} label="Joueur (si applicable)" name="player_id" id="player_id" />
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="display_name">
                Ou nom (si pas dans l&apos;effectif)
              </label>
              <input
                id="display_name"
                type="text"
                name="display_name"
                placeholder="Ex. un fondateur historique"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="category">
                Catégorie
              </label>
              <select
                id="category"
                name="category"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              >
                {Object.entries(HALL_OF_FAME_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cream/80" htmlFor="retired_number">
                  Numéro retiré
                </label>
                <input
                  id="retired_number"
                  type="number"
                  name="retired_number"
                  placeholder="Facultatif"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-cream/80" htmlFor="inducted_at">
                  Date d&apos;intronisation
                </label>
                <input
                  id="inducted_at"
                  type="date"
                  name="inducted_at"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
                />
              </div>
            </div>
            <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
              Introniser
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
