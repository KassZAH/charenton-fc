import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getTrashedMatches, getTrashedGoals, getTrashedCards, formatDeletedAt } from "@/lib/data/trash";
import { restoreTrashedMatch, restoreTrashedGoal, restoreTrashedCard } from "@/lib/data/trash-actions";

export default async function TrashPage() {
  await requireAdmin();
  const [matches, goals, cards] = await Promise.all([getTrashedMatches(), getTrashedGoals(), getTrashedCards()]);

  const isEmpty = matches.length === 0 && goals.length === 0 && cards.length === 0;

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Corbeille</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Admin
        </Link>
      </div>
      <p className="mb-4 text-xs text-steel/70">
        Matchs, buts et cartons supprimés. Les joueurs ne sont pas ici : ils sont archivés (fiche joueur), pas
        supprimés.
      </p>

      {isEmpty && <p className="text-sm text-steel/70">La corbeille est vide.</p>}

      {matches.length > 0 && (
        <Section title="Matchs">
          {matches.map((m) => (
            <TrashRow key={m.id} label={m.label} deletedAt={m.deletedAt}>
              <form action={restoreTrashedMatch.bind(null, m.id)}>
                <button type="submit" className="text-xs font-bold text-gold">
                  Restaurer
                </button>
              </form>
            </TrashRow>
          ))}
        </Section>
      )}

      {goals.length > 0 && (
        <Section title="Buts">
          {goals.map((g) => (
            <TrashRow key={g.id} label={g.label} deletedAt={g.deletedAt}>
              <form action={restoreTrashedGoal.bind(null, g.id, g.matchId)}>
                <button type="submit" className="text-xs font-bold text-gold">
                  Restaurer
                </button>
              </form>
            </TrashRow>
          ))}
        </Section>
      )}

      {cards.length > 0 && (
        <Section title="Cartons">
          {cards.map((c) => (
            <TrashRow key={c.id} label={c.label} deletedAt={c.deletedAt}>
              <form action={restoreTrashedCard.bind(null, c.id, c.matchId)}>
                <button type="submit" className="text-xs font-bold text-gold">
                  Restaurer
                </button>
              </form>
            </TrashRow>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">{title}</h2>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

function TrashRow({ label, deletedAt, children }: { label: string; deletedAt: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2">
      <div>
        <p className="text-sm text-cream">{label}</p>
        <p className="text-[10px] text-steel/60">Supprimé le {formatDeletedAt(deletedAt)}</p>
      </div>
      {children}
    </li>
  );
}
