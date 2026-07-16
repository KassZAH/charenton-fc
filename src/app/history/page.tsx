import { requireAdmin } from "@/lib/auth/current-user";
import { getRecentAuditLog } from "@/lib/data/audit";
import { restoreChange } from "@/lib/data/audit-actions";

const ACTION_LABELS: Record<string, string> = {
  insert: "Création",
  update: "Modification",
  delete: "Suppression",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoryPage() {
  await requireAdmin();
  const entries = await getRecentAuditLog();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-lg font-bold text-navy">Historique</h1>
      <p className="mb-6 text-sm text-navy/60">
        Les 30 dernières corrections à fort enjeu (scores, buts, cartons, fiches joueurs), avec possibilité de
        restaurer.
      </p>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-navy/10 bg-white p-4 text-sm text-navy/60">
          Aucune modification tracée pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-navy/10 bg-white p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-navy">
                  {entry.tableLabel} · {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
                <p className="text-xs text-navy/50">{formatDateTime(entry.createdAt)}</p>
              </div>
              <p className="mb-2 text-xs text-navy/50">par {entry.changedByName}</p>

              {entry.diffLines.length > 0 && (
                <ul className="mb-2 space-y-0.5">
                  {entry.diffLines.map((line) => (
                    <li key={line.label} className="text-xs text-navy/70">
                      <span className="font-medium">{line.label}</span> : {line.from} → {line.to}
                    </li>
                  ))}
                </ul>
              )}

              {entry.restoredAt ? (
                <p className="text-xs font-medium text-navy/40">
                  Restauré le {formatDateTime(entry.restoredAt)}
                </p>
              ) : (
                <form action={restoreChange.bind(null, entry.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/70"
                  >
                    Restaurer
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
