import { getMatchEquipment } from "@/lib/data/equipment";
import { addEquipmentItem, deleteEquipmentItem, toggleEquipmentBrought, claimEquipmentItem } from "@/lib/data/equipment-actions";
import { Button } from "@/components/ui/Button";

export async function EquipmentSection({ matchId, isAdmin }: { matchId: string; isAdmin: boolean }) {
  const items = await getMatchEquipment(matchId);
  if (items.length === 0 && !isAdmin) return null;

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Qui apporte quoi</h2>

      {items.length === 0 ? (
        <p className="text-sm text-steel/70">Rien de prévu pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className={`text-sm font-medium ${item.brought ? "text-steel line-through" : "text-cream"}`}>
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
                <span className="text-xs text-steel/70">{item.assignedPlayerName ?? "Personne assigné"}</span>
                {!item.assignedPlayerName && (
                  <form action={claimEquipmentItem.bind(null, matchId, item.id)}>
                    <Button type="submit" variant="secondary">
                      Je m&apos;en occupe
                    </Button>
                  </form>
                )}
                <form action={toggleEquipmentBrought.bind(null, matchId, item.id, !item.brought)}>
                  <Button type="submit" variant={item.brought ? "primary" : "secondary"}>
                    {item.brought ? "✓ Apporté" : "Marquer apporté"}
                  </Button>
                </form>
              </div>
            </li>
          ))}
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
