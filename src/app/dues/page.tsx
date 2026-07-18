import { requireUser } from "@/lib/auth/current-user";
import { getActiveSeason } from "@/lib/data/seasons";
import { getSeasonDues, getMyDue } from "@/lib/data/dues";
import { setDueAmount, setPaidAmount, bulkSetDueAmount } from "@/lib/data/dues-actions";
import { isElevatedRole } from "@/types/models";

function formatEuros(amount: number) {
  return `${amount.toFixed(2)} €`;
}

function dueStatus(amountDue: number, amountPaid: number): "paid" | "partial" | "unpaid" | null {
  if (amountDue === 0) return null;
  const remaining = amountDue - amountPaid;
  return remaining <= 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
}

function StatusBadge({ status }: { status: "paid" | "partial" | "unpaid" | null }) {
  if (!status) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        status === "paid"
          ? "bg-emerald-400/15 text-emerald-300"
          : status === "partial"
            ? "bg-gold/20 text-gold"
            : "bg-red-400/15 text-red-300"
      }`}
    >
      {status === "paid" ? "Payé" : status === "partial" ? "Partiel" : "Non payé"}
    </span>
  );
}

export default async function DuesPage() {
  const user = await requireUser();
  const isAdmin = isElevatedRole(user.role);
  const season = await getActiveSeason();
  if (!season) {
    return (
      <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
        <h1 className="mb-2 text-lg font-extrabold text-cream">Cotisations</h1>
        <p className="text-sm text-steel/70">Aucune saison active — impossible de suivre les cotisations.</p>
      </div>
    );
  }

  if (!isAdmin) {
    const myDue = await getMyDue(season.id, user.playerId);
    const amountDue = myDue?.amountDue ?? 0;
    const amountPaid = myDue?.amountPaid ?? 0;
    const status = dueStatus(amountDue, amountPaid);

    return (
      <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gold">Cotisation</p>
        <h1 className="text-scoreboard mb-4 text-xl font-extrabold text-cream">{season.name}</h1>

        {amountDue === 0 ? (
          <p className="text-sm text-steel/70">Aucune cotisation fixée pour toi pour le moment.</p>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-navy-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-cream">Statut</span>
              <StatusBadge status={status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-gold">{formatEuros(amountPaid)}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">Payé</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-cream">{formatEuros(amountDue)}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">Dû</p>
              </div>
            </div>
          </section>
        )}
        <p className="mt-4 text-xs text-steel/60">Seuls les admins/coachs peuvent modifier les cotisations.</p>
      </div>
    );
  }

  const dues = await getSeasonDues(season.id);
  const totalDue = dues.reduce((sum, d) => sum + d.amountDue, 0);
  const totalPaid = dues.reduce((sum, d) => sum + d.amountPaid, 0);

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gold">Cotisations</p>
      <h1 className="text-scoreboard mb-4 text-xl font-extrabold text-cream">{season.name}</h1>

      <section className="mb-6 rounded-2xl border border-gold/15 bg-navy-mid p-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-2xl font-extrabold tabular-nums text-gold">{formatEuros(totalPaid)}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">Collecté</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums text-cream">{formatEuros(totalDue)}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">Attendu</p>
          </div>
        </div>
      </section>

      <form
        action={bulkSetDueAmount.bind(null, season.id)}
        className="mb-6 flex items-end gap-2 rounded-2xl border border-white/10 bg-navy-card p-4"
      >
        <label className="flex-1 text-sm text-cream">
          Fixer la cotisation pour tout le monde
          <input
            type="number"
            name="bulk_amount_due"
            min={0}
            step="0.01"
            placeholder="ex. 50"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </label>
        <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
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
  const status = dueStatus(due.amountDue, due.amountPaid);

  return (
    <li className="rounded-xl border border-white/10 bg-navy-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-cream">{due.name}</span>
        <StatusBadge status={status} />
      </div>
      <div className="flex gap-2">
        <form action={setDueAmount.bind(null, due.playerId, seasonId)} className="flex flex-1 items-center gap-1">
          <label className="flex-1 text-xs text-steel/70">
            Dû
            <input
              type="number"
              name="amount_due"
              min={0}
              step="0.01"
              defaultValue={due.amountDue || ""}
              className="mt-0.5 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream focus:border-gold/50 focus:outline-none"
            />
          </label>
          <button type="submit" className="mt-3 rounded-lg border border-white/15 px-2 py-1.5 text-xs text-cream/80">
            OK
          </button>
        </form>
        <form action={setPaidAmount.bind(null, due.playerId, seasonId)} className="flex flex-1 items-center gap-1">
          <label className="flex-1 text-xs text-steel/70">
            Payé
            <input
              type="number"
              name="amount_paid"
              min={0}
              step="0.01"
              defaultValue={due.amountPaid || ""}
              className="mt-0.5 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream focus:border-gold/50 focus:outline-none"
            />
          </label>
          <button type="submit" className="mt-3 rounded-lg border border-white/15 px-2 py-1.5 text-xs text-cream/80">
            OK
          </button>
        </form>
      </div>
    </li>
  );
}
