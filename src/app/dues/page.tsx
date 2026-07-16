import { requireAdmin } from "@/lib/auth/current-user";
import { getActiveSeason } from "@/lib/data/seasons";
import { getSeasonDues } from "@/lib/data/dues";
import { setDueAmount, setPaidAmount, bulkSetDueAmount } from "@/lib/data/dues-actions";

function formatEuros(amount: number) {
  return `${amount.toFixed(2)} €`;
}

export default async function DuesPage() {
  await requireAdmin();
  const season = await getActiveSeason();
  if (!season) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-2 text-lg font-bold text-navy">Cotisations</h1>
        <p className="text-sm text-navy/60">Aucune saison active — impossible de suivre les cotisations.</p>
      </div>
    );
  }

  const dues = await getSeasonDues(season.id);
  const totalDue = dues.reduce((sum, d) => sum + d.amountDue, 0);
  const totalPaid = dues.reduce((sum, d) => sum + d.amountPaid, 0);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">Cotisations</p>
      <h1 className="mb-4 text-lg font-bold text-navy">{season.name}</h1>

      <section className="mb-6 rounded-2xl border border-navy/10 bg-white p-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-navy">{formatEuros(totalPaid)}</p>
            <p className="text-xs text-navy/50">Collecté</p>
          </div>
          <div>
            <p className="text-lg font-bold text-navy">{formatEuros(totalDue)}</p>
            <p className="text-xs text-navy/50">Attendu</p>
          </div>
        </div>
      </section>

      <form
        action={bulkSetDueAmount.bind(null, season.id)}
        className="mb-6 flex items-end gap-2 rounded-2xl border border-navy/10 bg-white p-4"
      >
        <label className="flex-1 text-sm text-navy">
          Fixer la cotisation pour tout le monde
          <input
            type="number"
            name="bulk_amount_due"
            min={0}
            step="0.01"
            placeholder="ex. 50"
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-gold">
          Appliquer
        </button>
      </form>

      <ul className="space-y-2">
        {dues.map((d) => (
          <DueRow key={d.playerId} due={d} seasonId={season.id} />
        ))}
      </ul>
    </div>
  );
}

function DueRow({
  due,
  seasonId,
}: {
  due: { playerId: string; name: string; amountDue: number; amountPaid: number };
  seasonId: string;
}) {
  const remaining = due.amountDue - due.amountPaid;
  const status = due.amountDue === 0 ? null : remaining <= 0 ? "paid" : due.amountPaid > 0 ? "partial" : "unpaid";

  return (
    <li className="rounded-xl border border-navy/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy">{due.name}</span>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              status === "paid"
                ? "bg-emerald-100 text-emerald-700"
                : status === "partial"
                  ? "bg-gold/20 text-navy"
                  : "bg-red-100 text-red-600"
            }`}
          >
            {status === "paid" ? "Payé" : status === "partial" ? "Partiel" : "Non payé"}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <form action={setDueAmount.bind(null, due.playerId, seasonId)} className="flex flex-1 items-center gap-1">
          <label className="flex-1 text-xs text-navy/50">
            Dû
            <input
              type="number"
              name="amount_due"
              min={0}
              step="0.01"
              defaultValue={due.amountDue || ""}
              className="mt-0.5 w-full rounded-lg border border-navy/20 px-2 py-1.5 text-sm"
            />
          </label>
          <button type="submit" className="mt-3 rounded-lg border border-navy/20 px-2 py-1.5 text-xs text-navy/70">
            OK
          </button>
        </form>
        <form action={setPaidAmount.bind(null, due.playerId, seasonId)} className="flex flex-1 items-center gap-1">
          <label className="flex-1 text-xs text-navy/50">
            Payé
            <input
              type="number"
              name="amount_paid"
              min={0}
              step="0.01"
              defaultValue={due.amountPaid || ""}
              className="mt-0.5 w-full rounded-lg border border-navy/20 px-2 py-1.5 text-sm"
            />
          </label>
          <button type="submit" className="mt-3 rounded-lg border border-navy/20 px-2 py-1.5 text-xs text-navy/70">
            OK
          </button>
        </form>
      </div>
    </li>
  );
}
