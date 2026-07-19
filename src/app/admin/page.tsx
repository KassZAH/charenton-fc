import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getDataHealth } from "@/lib/data/data-health";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";

export default async function AdminPage() {
  const user = await requireAdmin();
  const health = await getDataHealth();

  return (
    <ResponsivePageContainer size="full">
      <h1 className="text-scoreboard mb-4 text-xl font-extrabold text-cream">Gestion de l&apos;équipe</h1>

      {(health.matchesNeedingReview > 0 || health.backupIsStale) && (
        <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm text-gold">
          {health.matchesNeedingReview > 0 && (
            <p>⚠️ {health.matchesNeedingReview} match(s) à vérifier</p>
          )}
          {health.backupIsStale && <p>❌ Dernière sauvegarde ancienne ou absente</p>}
        </div>
      )}

      <ul className="space-y-2">
        <li>
          <Link
            href="/admin/sante"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            📋 Tableau de santé des données
          </Link>
        </li>
        <li>
          <Link
            href="/admin/sauvegardes"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            💾 Sauvegardes
          </Link>
        </li>
        <li>
          <Link
            href="/admin/corbeille"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            🗑️ Corbeille
          </Link>
        </li>
        <li>
          <Link
            href="/admin/saisons"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            📅 Saisons
          </Link>
        </li>
        <li>
          <Link
            href="/history"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            🕓 Historique des modifications
          </Link>
        </li>
        <li>
          <Link
            href="/admin/terrains"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            🏟️ Terrains
          </Link>
        </li>
        <li>
          <Link
            href="/admin/modeles"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            📐 Modèles de match
          </Link>
        </li>
        <li>
          <Link
            href="/admin/checklist"
            className="block rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
          >
            ✅ Checklist d&apos;équipe
          </Link>
        </li>
        {user.isOwner && (
          <li>
            <Link
              href="/admin/coachs"
              className="block rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm font-semibold text-gold"
            >
              👑 Gestion des coachs
            </Link>
          </li>
        )}
      </ul>
    </ResponsivePageContainer>
  );
}
