import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getMatchById } from "@/lib/data/matches";
import { getMatchAvailabilitySummary } from "@/lib/data/availability";
import { getMatchGoals } from "@/lib/data/goals";
import { finishMatch, addLiveNote } from "@/lib/data/live-match-actions";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";
import { RosterSection } from "../RosterSection";
import { GoalkeeperSection } from "../GoalkeeperSection";
import { GoalsSection } from "../GoalsSection";
import { CardsSection } from "../CardsSection";
import { AdminAvailabilityRow } from "../AdminAvailabilityRow";
import { LiveTimer } from "./LiveTimer";

/**
 * Écran "Match en cours" (roadmap V3, Lot 15, V2 §5.2-5.3) — saisie mobile
 * au bord du terrain, réservé au Coach/Propriétaire. Réutilise volontairement
 * les sections déjà existantes (feuille de match, gardien, buts, cartons)
 * plutôt que de dupliquer leur logique.
 */
export default async function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const matchRow = await getMatchById(id);
  if (!matchRow) notFound();
  if (matchRow.status !== "live") redirect(`/matches/${id}`);
  // started_at existe en base (Lot 14) mais pas encore dans les types générés (projet isolé
  // uniquement pour l'instant) — cast local, même pattern que le reste du lot.
  const match = matchRow as typeof matchRow & { started_at: string | null };

  const [goals, availability] = await Promise.all([getMatchGoals(id), getMatchAvailabilitySummary(id)]);
  const teamScore = goals.filter((g) => g.credited_to === "charenton").length;
  const opponentScore = goals.filter((g) => g.credited_to === "opponent").length;
  const opponentLabel = match.opponent_name ?? "Adversaire à confirmer";
  const isHome = match.home_or_away === "home";

  return (
    <ResponsivePageContainer size="wide">
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gold/20 bg-navy-deep/95 px-4 py-3 backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          🔴 En direct · {match.started_at ? <LiveTimer startedAt={match.started_at} /> : null}
        </p>
        <p className="text-scoreboard text-2xl font-extrabold text-cream">
          {isHome ? "Charenton FC" : opponentLabel} {teamScore} – {opponentScore} {isHome ? opponentLabel : "Charenton FC"}
        </p>
        <form action={finishMatch.bind(null, id)} className="mt-2">
          <button type="submit" className="w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-navy-deep">
            Terminer le match
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-cream">Présence réelle</h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {availability.map((a) => (
            <AdminAvailabilityRow
              key={a.player.id}
              matchId={id}
              playerId={a.player.id}
              playerName={a.player.nickname || a.player.first_name}
              initialStatus={a.status}
            />
          ))}
        </div>
      </section>

      <RosterSection matchId={id} />
      <GoalkeeperSection matchId={id} />
      <GoalsSection matchId={id} isAdmin />
      <CardsSection matchId={id} isAdmin />

      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold text-cream">Note</h2>
        <form action={addLiveNote.bind(null, id)} className="flex gap-2">
          <input
            type="text"
            name="note"
            placeholder="Ex. blessure, changement tactique..."
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
          />
          <button type="submit" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-cream/80">
            Ajouter
          </button>
        </form>
        {match.description && (
          <p className="mt-3 whitespace-pre-line rounded-lg border border-white/10 bg-navy-card p-3 text-xs text-steel/80">
            {match.description}
          </p>
        )}
      </section>
    </ResponsivePageContainer>
  );
}
