import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getBackupArtifactsMetadata, getBackupMetadata, getLiveTableCounts, type BackupMetadata } from "@/lib/data/backups";
import { createManualBackup, exportAuditLogArtifactAction } from "@/lib/data/backups-actions";
import { formatShortDate } from "@/lib/format";
import { BACKUP_TRIGGER_LABELS, BACKUP_TYPE_LABELS } from "@/types/models";
import { checksumPresenceStatus, CHECKSUM_STATUS_LABELS } from "@/lib/data/backup-integrity";
import { DownloadBackupButton } from "./DownloadBackupButton";
import { DeleteBackupForm } from "./DeleteBackupForm";
import { VerifyIntegrityButton } from "./VerifyIntegrityButton";

function protectionLabel(protectedFlag: boolean | null): string {
  if (protectedFlag === null) return "Protégé — backup legacy";
  return protectedFlag ? "Protégé" : "Non protégé";
}

function totalRows(tableCounts: unknown): number {
  if (!tableCounts || typeof tableCounts !== "object") return 0;
  return Object.values(tableCounts as Record<string, number>).reduce((sum, n) => sum + (n ?? 0), 0);
}

export default async function BackupsPage() {
  const user = await requireAdmin();
  const [backups, liveCounts] = await Promise.all([getBackupMetadata(), getLiveTableCounts()]);
  const latest = backups[0] ?? null;

  const artifactsByBackup = new Map(
    await Promise.all(backups.map(async (b) => [b.id, await getBackupArtifactsMetadata(b.id)] as const))
  );

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Sauvegardes</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-gold/20 bg-gold/5 p-3 text-xs text-gold">
        <p className="font-semibold">Sauvegarde téléchargeable. La restauration complète reste une opération administrateur assistée.</p>
        <p className="mt-1 text-cream/70">
          Ces sauvegardes créent un fichier JSON complet et cohérent, mais il n&apos;y a pas de bouton pour le
          réimporter. En cas de besoin, la restauration se fait manuellement, table par table. Télécharge aussi une
          copie de temps en temps sur ton ordinateur (pas seulement dans Supabase) : si le projet Supabase lui-même
          est perdu ou corrompu, les sauvegardes stockées dedans le sont aussi.
        </p>
      </div>

      <form action={createManualBackup} className="mb-6 flex flex-col gap-2">
        <div className="flex items-end gap-2">
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
        </div>
        {user.isOwner && (
          <label className="flex items-center gap-2 text-xs text-cream/70">
            <input type="checkbox" name="protected" className="rounded border-white/20" />
            Protéger cette sauvegarde (jamais supprimable depuis l&apos;interface)
          </label>
        )}
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

      {user.isOwner && (
        <div className="mb-4 rounded-xl border border-red-400/25 bg-red-400/5 p-3 text-xs text-red-300">
          Ce fichier contient des empreintes de PIN, des données d&apos;authentification et des informations
          personnelles sensibles. Conserve-le dans un emplacement sécurisé et ne le partage jamais tel quel.
        </div>
      )}

      {backups.length === 0 ? (
        <p className="text-sm text-steel/70">Aucune sauvegarde pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {backups.map((b: BackupMetadata) => {
            const artifacts = artifactsByBackup.get(b.id) ?? [];
            const auditArtifact = artifacts.find((a) => a.artifact_type === "audit_log");
            return (
              <li key={b.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-cream">{b.label}</p>
                    <p className="text-xs text-steel/70">
                      {BACKUP_TRIGGER_LABELS[b.trigger_reason as keyof typeof BACKUP_TRIGGER_LABELS] ?? b.trigger_reason}
                      {b.backup_type && ` · ${BACKUP_TYPE_LABELS[b.backup_type as keyof typeof BACKUP_TYPE_LABELS] ?? b.backup_type}`}
                      {" · "}
                      {b.createdByName ?? b.created_by_context ?? "Système"}
                      {b.active_season_name && ` · ${b.active_season_name}`}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-steel/70">{formatShortDate(b.created_at)}</p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-cream/70">
                    {b.format_version === 2 ? "Format 2" : "Format 1 (legacy)"}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-cream/70">
                    {protectionLabel(b.protected)}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-cream/70">
                    {CHECKSUM_STATUS_LABELS[checksumPresenceStatus(b.checksum)]}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-cream/70 tabular-nums">
                    {Object.keys((b.table_counts as Record<string, number>) ?? {}).length} tables · {totalRows(b.table_counts)} lignes
                  </span>
                </div>

                <details className="mt-2 text-[11px] text-cream/70">
                  <summary className="cursor-pointer text-steel/80">Tables incluses / exclues</summary>
                  {b.tables_included ? (
                    <div className="mt-1 space-y-1">
                      <p>Incluses : {b.tables_included.join(", ")}</p>
                      <p>Exclues : {(b.tables_excluded ?? []).join(", ") || "—"}</p>
                    </div>
                  ) : (
                    <p className="mt-1">Non disponible pour ce format historique.</p>
                  )}
                </details>

                {b.checksum && <VerifyIntegrityButton backupId={b.id} />}

                {user.isOwner && (
                  <div className="mt-2 space-y-1">
                    <DownloadBackupButton backupId={b.id} href={`/api/backups/${b.id}/download`} />

                    {auditArtifact ? (
                      <a
                        href={`/api/backups/${b.id}/artifacts/${auditArtifact.id}/download`}
                        className="block text-xs font-medium text-gold underline underline-offset-2"
                      >
                        Télécharger l&apos;export audit_log ({auditArtifact.row_count} entrées)
                      </a>
                    ) : (
                      <form action={exportAuditLogArtifactAction.bind(null, b.id)}>
                        <button type="submit" className="text-xs font-medium text-gold underline underline-offset-2">
                          Exporter audit_log pour ce backup
                        </button>
                      </form>
                    )}

                    {b.protected === false && <DeleteBackupForm backupId={b.id} label={b.label} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
