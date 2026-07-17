import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getActiveSeason } from "@/lib/data/seasons";
import { getSeasonTrophies } from "@/lib/data/season-trophies";
import { upsertSeasonTrophy, deleteSeasonTrophy } from "@/lib/data/season-trophies-actions";
import { getActivePlayers } from "@/lib/data/players";
import { formatShortDateOnly } from "@/lib/format";
import { isElevatedRole, SEASON_TROPHY_CATEGORY_LABELS } from "@/types/models";
import { PlayerSelect } from "@/components/ui/PlayerSelect";

export default async function SeasonTrophiesPage() {
  const user = await requireUser();
  const isAdmin = isElevatedRole(user.role);
  const season = await getActiveSeason();

  if (!season) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-steel/70">Aucune saison active pour le moment.</p>
      </div>
    );
  }

  const [trophies, players] = await Promise.all([getSeasonTrophies(season.id), isAdmin ? getActivePlayers() : Promise.resolve([])]);
  const playerOptions = players.map((p) => ({ id: p.id, name: p.nickname || p.first_name }));
  const awardedCategories = new Set(trophies.map((t) => t.category));

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Trophées — {season.name}</h1>
        <Link href="/trophees" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Trophées
        </Link>
      </div>

      {trophies.length === 0 ? (
        <p className="mb-6 text-sm text-steel/70">Aucun trophée attribué pour le moment.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {trophies.map((t) => (
            <li key={t.id} className="rounded-xl border border-gold/15 bg-navy-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gold">
                    {SEASON_TROPHY_CATEGORY_LABELS[t.category as keyof typeof SEASON_TROPHY_CATEGORY_LABELS] ?? t.category}
                  </p>
                  <p className="text-sm font-semibold text-cream">{t.display_name || t.playerName}</p>
                </div>
                <p className="shrink-0 text-xs text-steel/70">{formatShortDateOnly(t.awarded_at)}</p>
              </div>
              {t.description && <p className="mt-1 text-sm text-cream/80">{t.description}</p>}
              {isAdmin && (
                <form action={deleteSeasonTrophy.bind(null, t.id)} className="mt-2">
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
          <h2 className="mb-3 text-sm font-bold text-cream">Attribuer un trophée</h2>
          <form action={upsertSeasonTrophy.bind(null, season.id)} className="space-y-3">
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
                {Object.entries(SEASON_TROPHY_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                    {awardedCategories.has(value) ? " (déjà attribué — remplace)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <PlayerSelect players={playerOptions} label="Joueur" name="player_id" id="player_id" />
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="display_name">
                Ou nom (si pas dans l&apos;effectif)
              </label>
              <input
                id="display_name"
                type="text"
                name="display_name"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
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
            <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
              Attribuer
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
