import Link from "next/link";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getDemoSeason } from "@/lib/data/demo-scope";
import { attachOpponents } from "@/lib/data/matches";
import { resetDemoDatasetAction, deleteDemoDatasetAction } from "@/lib/data/demo-actions";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { formatMatchDate } from "@/lib/format";
import { isElevatedRole } from "@/types/models";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "À venir",
  live: "En direct",
  completed: "Terminé",
  cancelled: "Annulé",
  postponed: "Reporté",
};

/**
 * Mode Démo (présentation aux coachs) — réservé Propriétaire/Coachs (jamais visible d'un compte
 * Joueur dans son utilisation normale). Les fiches de match elles-mêmes restent les pages
 * existantes (/matches/[id]) — ce n'est qu'une liste d'entrée dédiée à la saison Démo.
 */
export default async function DemoModePage() {
  const user = await requireFreshCoach();
  const isOwner = isElevatedRole(user.role) && user.isOwner;
  const demoSeason = await getDemoSeason();

  if (!demoSeason) {
    return (
      <ResponsivePageContainer size="full">
        <DemoModeBanner />
        <h1 className="mt-4 text-lg font-extrabold text-cream">Mode Démo</h1>
        <p className="mt-2 text-sm text-steel/70">
          Aucune démonstration n&apos;a encore été créée. {isOwner ? "Crée-la ci-dessous." : "Demande à un propriétaire de la créer."}
        </p>
        {isOwner && (
          <form action={resetDemoDatasetAction} className="mt-4 space-y-2 rounded-xl border border-white/10 bg-navy-card p-3">
            <label className="block text-xs text-cream">
              Tape « REINITIALISER DEMO » pour créer la démonstration
              <input
                type="text"
                name="confirmation"
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
              />
            </label>
            <button type="submit" className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
              Créer la démonstration
            </button>
          </form>
        )}
      </ResponsivePageContainer>
    );
  }

  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("season_id", demoSeason.id)
    .order("match_date", { ascending: true });
  if (error) throw new Error(error.message);
  const withOpponents = await attachOpponents(matches ?? []);

  return (
    <ResponsivePageContainer size="full">
      <DemoModeBanner />
      <div className="mt-4 mb-2 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-cream">Mode Démo — {demoSeason.name}</h1>
        <Link href="/" className="text-xs font-medium text-steel underline underline-offset-2">
          Quitter
        </Link>
      </div>
      <p className="mb-4 text-xs text-steel/70">
        {withOpponents.length} match(s) fictif(s) — noms des vrais joueurs, aucune donnée réelle. Les liens ci-dessous
        ouvrent les fiches de match normales de l&apos;application.
      </p>

      <ul className="space-y-2">
        {withOpponents.map((m) => (
          <li key={m.id}>
            <Link
              href={`/matches/${m.id}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
            >
              <div>
                <p className="text-sm font-semibold text-cream">
                  {m.home_or_away === "home" ? "vs" : "@"} {m.opponent_name ?? "Adversaire fictif"}
                </p>
                <p className="text-xs text-steel">{formatMatchDate(m.match_date)}</p>
              </div>
              <span className="text-xs font-semibold text-gold">{STATUS_LABELS[m.status] ?? m.status}</span>
            </Link>
          </li>
        ))}
      </ul>

      {isOwner && (
        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Gestion (Propriétaire)</h2>
          <div className="space-y-3">
            <form action={resetDemoDatasetAction} className="space-y-2 rounded-xl border border-white/10 bg-navy-card p-3">
              <label className="block text-xs text-cream">
                Tape « REINITIALISER DEMO » pour régénérer un dataset fictif propre
                <input
                  type="text"
                  name="confirmation"
                  required
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
                />
              </label>
              <button type="submit" className="w-full rounded-lg border border-gold/40 py-2 text-sm font-semibold text-gold">
                Réinitialiser la démonstration
              </button>
            </form>

            <form action={deleteDemoDatasetAction} className="space-y-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3">
              <label className="block text-xs text-cream">
                Tape « SUPPRIMER DEMO » pour supprimer entièrement la démonstration (saison incluse)
                <input
                  type="text"
                  name="confirmation"
                  required
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
                />
              </label>
              <button type="submit" className="w-full rounded-lg border border-red-400/40 py-2 text-sm font-semibold text-red-300">
                Supprimer entièrement la démonstration
              </button>
            </form>
          </div>
        </section>
      )}
    </ResponsivePageContainer>
  );
}
