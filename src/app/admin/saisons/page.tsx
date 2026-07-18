import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getAllSeasons, getOpenMatchesInActiveSeason } from "@/lib/data/seasons";
import { toggleSeasonLock, startNewSeason } from "@/lib/data/seasons-actions";
import { getActivePlayers } from "@/lib/data/players";
import { setPlayerStatus } from "@/lib/data/players-actions";
import { formatShortDateOnly, formatMatchDate } from "@/lib/format";

export default async function SeasonsPage() {
  await requireAdmin();
  const [seasons, openMatches, players] = await Promise.all([
    getAllSeasons(),
    getOpenMatchesInActiveSeason(),
    getActivePlayers(),
  ]);

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Saisons</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <ul className="mb-6 space-y-2">
        {seasons.map((s) => (
          <li key={s.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cream">
                  {s.name} {s.is_active && <span className="text-gold">· active</span>}
                </p>
                <p className="text-xs text-steel/70">
                  {s.start_date ? formatShortDateOnly(s.start_date) : "—"} →{" "}
                  {s.end_date ? formatShortDateOnly(s.end_date) : "—"}
                </p>
              </div>
              <form action={toggleSeasonLock.bind(null, s.id, !s.is_locked)}>
                <button
                  type="submit"
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    s.is_locked ? "border-gold/40 text-gold" : "border-white/15 text-cream/80"
                  }`}
                >
                  {s.is_locked ? "🔒 Verrouillée" : "🔓 Déverrouillée"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <section className="mb-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold text-cream">Nouvelle saison</h2>

        {openMatches.length > 0 && (
          <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
            ⚠️ {openMatches.length} match{openMatches.length > 1 ? "s" : ""} pas encore joué
            {openMatches.length > 1 ? "s" : ""} dans la saison active :
            <ul className="mt-1 list-inside list-disc">
              {openMatches.map((m) => (
                <li key={m.id}>{formatMatchDate(m.matchDate)}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={startNewSeason} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-cream/80" htmlFor="name">
              Nom
            </label>
            <input
              id="name"
              type="text"
              name="name"
              required
              placeholder="Saison 2026-2027"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="start_date">
                Début
              </label>
              <input
                id="start_date"
                type="date"
                name="start_date"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="end_date">
                Fin (facultatif)
              </label>
              <input
                id="end_date"
                type="date"
                name="end_date"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-steel/60">
            Crée une sauvegarde, clôture et verrouille la saison active, puis démarre celle-ci. Les statistiques par
            saison sont toujours recalculées à la volée : rien à réinitialiser.
          </p>
          <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-navy-deep">
            Créer la nouvelle saison
          </button>
        </form>
      </section>

      <section className="border-t border-white/10 pt-6">
        <h2 className="mb-1 text-sm font-bold text-cream">Effectif</h2>
        <p className="mb-3 text-xs text-steel/70">
          Archive les joueurs qui ne reviennent pas — leur historique reste intact, ils disparaissent juste des
          listes actives.
        </p>
        <ul className="space-y-1.5">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2">
              <span className="text-sm text-cream">{p.nickname || p.first_name}</span>
              <form action={setPlayerStatus.bind(null, p.id, "archived")}>
                <button type="submit" className="text-xs font-medium text-steel/60">
                  Archiver
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
