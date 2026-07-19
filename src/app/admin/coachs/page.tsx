import Link from "next/link";
import { requireOwner } from "@/lib/auth/current-user";
import { getActivePlayers } from "@/lib/data/players";
import { getOwnerPlayerId } from "@/lib/data/team-settings";
import { promoteToCoach, demoteToPlayer } from "@/lib/data/ownership-actions";
import { OWNERSHIP_TRANSFER_ENABLED } from "@/lib/data/team-settings";
import { isElevatedRole } from "@/types/models";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";
import { TransferOwnershipForm } from "./TransferOwnershipForm";

function displayName(p: { nickname: string | null; first_name: string }) {
  return p.nickname || p.first_name;
}

export default async function CoachManagementPage() {
  await requireOwner();

  const [players, ownerPlayerId] = await Promise.all([getActivePlayers(), getOwnerPlayerId()]);

  const owner = players.find((p) => p.id === ownerPlayerId) ?? null;
  const coaches = players.filter((p) => isElevatedRole(p.role) && p.id !== ownerPlayerId);
  const regularPlayers = players.filter((p) => !isElevatedRole(p.role));
  const transferCandidates = players.filter((p) => p.id !== ownerPlayerId).map((p) => ({ id: p.id, displayName: displayName(p) }));

  return (
    <ResponsivePageContainer size="full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Gestion des coachs</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <section className="mb-6 rounded-xl border border-gold/30 bg-gold/5 p-3">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-gold">👑 Propriétaire actuel</h2>
        <p className="text-sm font-semibold text-cream">{owner ? displayName(owner) : "—"}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Coachs</h2>
        {coaches.length === 0 ? (
          <p className="text-sm text-steel/70">Aucun autre coach.</p>
        ) : (
          <ul className="space-y-2">
            {coaches.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3">
                <span className="text-sm font-semibold text-cream">{displayName(c)}</span>
                <form action={demoteToPlayer.bind(null, c.id)}>
                  <button type="submit" className="text-xs font-medium text-steel/70 underline underline-offset-2">
                    Rétrograder en joueur
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Joueurs</h2>
        {regularPlayers.length === 0 ? (
          <p className="text-sm text-steel/70">Aucun joueur.</p>
        ) : (
          <ul className="space-y-2">
            {regularPlayers.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3">
                <span className="text-sm font-semibold text-cream">{displayName(p)}</span>
                <form action={promoteToCoach.bind(null, p.id)}>
                  <button type="submit" className="text-xs font-medium text-gold underline underline-offset-2">
                    Promouvoir en coach
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-white/10 pt-6">
        <h2 className="mb-2 text-sm font-semibold text-red-400">Transférer la propriété</h2>
        {OWNERSHIP_TRANSFER_ENABLED ? (
          <>
            <p className="mb-3 text-xs text-steel/70">
              Action irréversible sans un nouveau transfert : {owner ? displayName(owner) : "le propriétaire actuel"}{" "}
              perd ses droits de propriétaire (reste coach) au profit du joueur choisi ci-dessous, qui devient coach
              s&apos;il ne l&apos;était pas déjà. Toutes les sessions concernées sont immédiatement révoquées.
            </p>
            <TransferOwnershipForm candidates={transferCandidates} />
          </>
        ) : (
          <p className="rounded-xl border border-white/10 bg-navy-card p-3 text-xs text-steel/70">
            Temporairement désactivé : cette action n&apos;a pas encore été testée sur un environnement isolé.
          </p>
        )}
      </section>
    </ResponsivePageContainer>
  );
}
