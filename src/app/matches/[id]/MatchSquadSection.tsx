import { getActivePlayers } from "@/lib/data/players";
import { getMatchSquad } from "@/lib/data/match-squad";
import { saveMatchSquadDraft, publishMatchSquad, unlockMatchSquad } from "@/lib/data/match-squad-actions";
import { getActiveRestrictionsByPlayerId } from "@/lib/data/player-restrictions";
import { getRotationSuggestions } from "@/lib/data/rotation";
import { RESTRICTION_TYPE_LABELS, type PlayerRestriction, type RestrictionType } from "@/types/models";

/**
 * Groupe convoqué (roadmap V3, Lot 17) — plan distinct de la présence
 * réelle. Lecture ouverte à tous ; édition réservée au Coach/Propriétaire,
 * verrouillée une fois publiée.
 *
 * Lot 19 : alerte non bloquante pour le coach quand un joueur convoqué a une restriction
 * active — jamais un blocage de la sélection, juste un signal ⚠️ à côté du nom.
 */
export async function MatchSquadSection({ matchId, isAdmin }: { matchId: string; isAdmin: boolean }) {
  const [players, squad, restrictionsByPlayerId, rotationSuggestions] = await Promise.all([
    getActivePlayers(),
    getMatchSquad(matchId),
    isAdmin ? getActiveRestrictionsByPlayerId() : Promise.resolve(new Map<string, PlayerRestriction>()),
    isAdmin ? getRotationSuggestions(matchId) : Promise.resolve([]),
  ]);
  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  function restrictionAlert(playerId: string) {
    const restriction = restrictionsByPlayerId.get(playerId);
    if (!restriction || !isAdmin) return null;
    return (
      <span
        className="ml-1 text-gold"
        title={restriction.restriction_types.map((t: RestrictionType) => RESTRICTION_TYPE_LABELS[t]).join(" · ")}
      >
        ⚠️
      </span>
    );
  }
  const isLocked = squad.lockedAt !== null;

  if (isLocked || !isAdmin) {
    if (squad.calledUpPlayerIds.length === 0 && squad.waitlistPlayerIds.length === 0) {
      return isAdmin ? null : <p className="mt-4 text-sm text-steel/70">Composition pas encore publiée.</p>;
    }
    return (
      <section className="mt-8 border-t border-white/10 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-cream">Composition publiée</h2>
          {isAdmin && isLocked && (
            <form action={unlockMatchSquad.bind(null, matchId)}>
              <button type="submit" className="text-xs font-medium text-steel/60 underline underline-offset-2">
                Déverrouiller pour modifier
              </button>
            </form>
          )}
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-steel/70">Convoqués</p>
        <ul className="mb-3 space-y-1">
          {squad.calledUpPlayerIds.map((id) => (
            <li key={id} className="text-sm text-cream">
              {nameById.get(id) ?? "Joueur"}
              {squad.plannedGoalkeeperPlayerId === id && <span className="ml-1 text-steel/70">🧤</span>}
            </li>
          ))}
        </ul>
        {squad.waitlistPlayerIds.length > 0 && (
          <>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-steel/70">Liste d&apos;attente</p>
            <ul className="space-y-1">
              {squad.waitlistPlayerIds.map((id) => (
                <li key={id} className="text-sm text-steel/80">
                  {nameById.get(id) ?? "Joueur"}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    );
  }

  const calledUpSet = new Set(squad.calledUpPlayerIds);
  const waitlistSet = new Set(squad.waitlistPlayerIds);

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-1 text-sm font-bold text-cream">Groupe convoqué</h2>
      <p className="mb-3 text-xs text-steel/70">
        Prévisionnel, distinct de la présence réelle — publie pour verrouiller.
      </p>

      {rotationSuggestions.length > 0 && (
        <div className="mb-4 rounded-xl border border-gold/20 bg-gold/5 p-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gold">
            Suggestion de rotation (privé, tu restes décisionnaire)
          </p>
          <ul className="space-y-1">
            {rotationSuggestions.map((s) => (
              <li key={s.playerId} className="text-xs text-cream/80">
                {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={saveMatchSquadDraft.bind(null, matchId)} className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-steel/70">Convoqués</p>
          <div className="grid grid-cols-2 gap-1.5">
            {players.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy-card px-2 py-1.5 text-sm text-cream">
                <input type="checkbox" name="called_up_player_id" value={p.id} defaultChecked={calledUpSet.has(p.id)} />
                {p.nickname || p.first_name}
                {restrictionAlert(p.id)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-steel/70">Liste d&apos;attente</p>
          <div className="grid grid-cols-2 gap-1.5">
            {players.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy-card px-2 py-1.5 text-sm text-cream">
                <input type="checkbox" name="waitlist_player_id" value={p.id} defaultChecked={waitlistSet.has(p.id)} />
                {p.nickname || p.first_name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-cream/80" htmlFor="planned_goalkeeper_player_id">
            Gardien prévu (doit être convoqué)
          </label>
          <select
            id="planned_goalkeeper_player_id"
            name="planned_goalkeeper_player_id"
            defaultValue={squad.plannedGoalkeeperPlayerId ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
          >
            <option value="">— Aucun —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.first_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-cream/80">
            Enregistrer le brouillon
          </button>
          <button type="submit" formAction={publishMatchSquad.bind(null, matchId)} className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
            Publier et verrouiller
          </button>
        </div>
      </form>
    </section>
  );
}
