import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getDataHealth } from "@/lib/data/data-health";
import { formatShortDate } from "@/lib/format";

export default async function DataHealthPage() {
  await requireAdmin();
  const health = await getDataHealth();

  const consistentMatches = health.completedMatchesCount - health.matchesNeedingReview;

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Santé des données</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <ul className="space-y-2">
        <li className="rounded-xl border border-white/10 bg-navy-card px-3 py-2 text-sm text-cream">
          ✅ {consistentMatches} match{consistentMatches > 1 ? "s" : ""} cohérent{consistentMatches > 1 ? "s" : ""}
        </li>
        {health.matchesNeedingReview > 0 ? (
          <li className="rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-sm text-gold">
            <Link href="/matches/review" className="block">
              ⚠️ {health.matchesNeedingReview} match{health.matchesNeedingReview > 1 ? "s" : ""} incomplet
              {health.matchesNeedingReview > 1 ? "s" : ""}
            </Link>
          </li>
        ) : (
          <li className="rounded-xl border border-white/10 bg-navy-card px-3 py-2 text-sm text-cream">
            ✅ Aucun match incomplet
          </li>
        )}
        {health.lastBackup ? (
          <li
            className={`rounded-xl border px-3 py-2 text-sm ${
              health.backupIsStale ? "border-gold/20 bg-gold/5 text-gold" : "border-white/10 bg-navy-card text-cream"
            }`}
          >
            {health.backupIsStale ? "⚠️" : "✅"} Dernière sauvegarde : {formatShortDate(health.lastBackup.createdAt)} (
            {health.lastBackup.daysAgo} jour{health.lastBackup.daysAgo > 1 ? "s" : ""})
          </li>
        ) : (
          <li className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300">
            ❌ Aucune sauvegarde n&apos;a jamais été créée
          </li>
        )}
      </ul>

      <Link href="/admin/sauvegardes" className="mt-4 inline-block text-xs font-medium text-gold underline underline-offset-2">
        Gérer les sauvegardes →
      </Link>
    </div>
  );
}
