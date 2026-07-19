import { getMatchEquipment, suggestEquipmentAssignee } from "@/lib/data/equipment";
import {
  addEquipmentItem,
  deleteEquipmentItem,
  claimEquipmentItem,
  assignEquipmentItem,
  confirmEquipmentItem,
  markEquipmentBrought,
  markEquipmentForgotten,
  copyEquipmentFromPreviousMatch,
} from "@/lib/data/equipment-actions";
import { Button } from "@/components/ui/Button";

const STATUS_LABELS: Record<string, string> = {
  unassigned: "Personne assigné",
  assigned: "Assigné",
  confirmed: "Confirmé",
  brought: "✓ Apporté",
  forgotten: "❌ Oublié",
};

export async function EquipmentSection({ matchId, isAdmin }: { matchId: string; isAdmin: boolean }) {
  const items = await getMatchEquipment(matchId);
  if (items.length === 0 && !isAdmin) return null;

  const suggestions = isAdmin
    ? new Map(
        await Promise.all(
          items
            .filter((i) => i.status === "unassigned")
            .map(async (i) => [i.label, await suggestEquipmentAssignee(i.label)] as const)
        )
      )
    : new Map();

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-cream">Qui apporte quoi</h2>
        {isAdmin && (
          <form action={copyEquipmentFromPreviousMatch.bind(null, matchId)}>
            <button type="submit" className="text-xs font-medium text-steel/60 underline underline-offset-2">
              Reprendre le matériel du match précédent
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-steel/70">Rien de prévu pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const suggestion = suggestions.get(item.label);
            return (
              <li key={item.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className={`text-sm font-medium ${item.status === "brought" ? "text-steel line-through" : "text-cream"}`}>
                    {item.label}
                  </p>
                  {isAdmin && (
                    <form action={deleteEquipmentItem.bind(null, matchId, item.id)}>
                      <button type="submit" className="text-xs font-medium text-steel/60">
                        Suppr.
                      </button>
                    </form>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-steel/70">
                    {item.assignedPlayerName ?? STATUS_LABELS[item.status]}
                    {item.assignedPlayerName && ` · ${STATUS_LABELS[item.status]}`}
                  </span>

                  {!item.assignedPlayerName && (
                    <form action={claimEquipmentItem.bind(null, matchId, item.id)}>
                      <Button type="submit" variant="secondary">
                        Je m&apos;en occupe
                      </Button>
                    </form>
                  )}

                  {isAdmin && !item.assignedPlayerName && suggestion && (
                    <form action={assignEquipmentItem.bind(null, matchId, item.id, suggestion.playerId)}>
                      <button type="submit" className="rounded-full border border-gold/40 px-2.5 py-1 text-xs font-medium text-gold">
                        💡 Suggérer {suggestion.playerName} ({suggestion.timesBrought}x)
                      </button>
                    </form>
                  )}

                  {item.status === "assigned" && (
                    <form action={confirmEquipmentItem.bind(null, matchId, item.id)}>
                      <Button type="submit" variant="secondary">
                        Confirmer
                      </Button>
                    </form>
                  )}

                  {item.status !== "brought" && (
                    <form action={markEquipmentBrought.bind(null, matchId, item.id)}>
                      <Button type="submit" variant="primary">
                        Marquer apporté
                      </Button>
                    </form>
                  )}

                  {isAdmin && item.status !== "forgotten" && item.status !== "brought" && (
                    <form action={markEquipmentForgotten.bind(null, matchId, item.id)}>
                      <button type="submit" className="text-xs font-medium text-steel/60 underline underline-offset-2">
                        Marquer oublié
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <form
          action={addEquipmentItem.bind(null, matchId)}
          className="mt-4 flex items-end gap-2 rounded-xl border border-white/10 bg-navy-card p-3"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium text-cream/80" htmlFor="label">
              Nouvel élément
            </label>
            <input
              id="label"
              name="label"
              type="text"
              placeholder="ex. Ballons"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary">
            + Ajouter
          </Button>
        </form>
      )}
    </section>
  );
}
