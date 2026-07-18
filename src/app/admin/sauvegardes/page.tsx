import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getBackups, getLiveTableCounts } from "@/lib/data/backups";
import { createManualBackup } from "@/lib/data/backups-actions";
import { formatShortDate } from "@/lib/format";
import { BACKUP_TRIGGER_LABELS } from "@/types/models";

export default async function BackupsPage() {
  await requireAdmin();
  const [backups, liveCounts] = await Promise.all([getBackups(), getLiveTableCounts()]);
  const latest = backups[0] ?? null;

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Sauvegardes</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-gold/20 bg-gold/5 p-3 text-xs text-gold">
        <p className="font-semibold">Téléchargement uniquement — pas de restauration automatique.</p>
        <p className="mt-1 text-cream/70">
          Ces sauvegardes créent un fichier JSON complet et cohérent, mais il n&apos;y a pas de bouton pour le
          réimporter. En cas de besoin, la restauration se fait manuellement, table par table. Télécharge aussi une
          copie de temps en temps sur ton ordinateur (pas seulement dans Supabase) : si le projet Supabase lui-même
          est perdu ou corrompu, les sauvegardes stockées dedans le sont aussi.
        </p>
      </div>

      <form action={createManualBackup} className="mb-6 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-cream/80" htmlFor="label">
            Libellé
          </label>
          <input
            id="label"
            type="text"
            name="label"
            placeholder="Sauvegarde manuelle"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </div>
        <button type="submit" className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
          Créer
        </button>
      </form>

      {latest && (
        <section className="mb-6 rounded-xl border border-gold/15 bg-navy-mid p-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">
            Aperçu — dernière sauvegarde vs état actuel
          </h2>
          <ul className="space-y-1 text-xs">
            {Object.entries(latest.table_counts as Record<string, number>)
              .filter(([table, count]) => count !== (liveCounts[table] ?? 0))
              .map(([table, count]) => (
                <li key={table} className="flex items-center justify-between text-cream/80">
                  <span>{table}</span>
                  <span className="tabular-nums">
                    {count} → <span className="text-gold">{liveCounts[table] ?? 0}</span>
                  </span>
                </li>
              ))}
            {Object.entries(latest.table_counts as Record<string, number>).every(
              ([table, count]) => count === (liveCounts[table] ?? 0)
            ) && <li className="text-steel/70">Aucun changement depuis la dernière sauvegarde.</li>}
          </ul>
        </section>
      )}

      {backups.length === 0 ? (
        <p className="text-sm text-steel/70">Aucune sauvegarde pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {backups.map((b) => (
            <li key={b.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-cream">{b.label}</p>
                  <p className="text-xs text-steel/70">
                    {BACKUP_TRIGGER_LABELS[b.trigger_reason as keyof typeof BACKUP_TRIGGER_LABELS] ?? b.trigger_reason}
                    {b.createdByName ? ` · ${b.createdByName}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-steel/70">{formatShortDate(b.created_at)}</p>
              </div>
              <a
                href={`/api/backups/${b.id}/download`}
                className="mt-2 inline-block text-xs font-medium text-gold underline underline-offset-2"
              >
                Télécharger le JSON
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
