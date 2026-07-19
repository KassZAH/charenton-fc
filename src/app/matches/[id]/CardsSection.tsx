import Link from "next/link";
import { getMatchCards } from "@/lib/data/cards";
import { addCard, deleteCard } from "@/lib/data/cards-actions";
import { getActivePlayers } from "@/lib/data/players";
import type { Player } from "@/types/models";

const CARD_LABELS: Record<string, string> = { yellow: "Jaune", red: "Rouge" };

export async function CardsSection({ matchId, isAdmin }: { matchId: string; isAdmin: boolean }) {
  const cards = await getMatchCards(matchId);
  const players = isAdmin ? await getActivePlayers() : [];

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Cartons</h2>

      {cards.length === 0 ? (
        <p className="text-sm text-steel/70">Aucun carton.</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card p-3"
            >
              <div className="text-sm text-cream">
                <span
                  className={`mr-2 inline-block h-3 w-2.5 rounded-sm align-middle ${
                    card.card_type === "red" ? "bg-red-500" : "bg-yellow-400"
                  }`}
                />
                {card.player_id ? (
                  <Link href={`/team/${card.player_id}`} className="font-semibold underline-offset-2 hover:underline">
                    {card.player_name}
                  </Link>
                ) : (
                  <span className="font-semibold">{card.player_name}</span>
                )}
                <span className="text-steel"> — {CARD_LABELS[card.card_type] ?? card.card_type}</span>
                {card.minute != null && <span className="text-steel/70"> · {card.minute}&apos;</span>}
                {card.comment && <span className="text-steel/70"> · {card.comment}</span>}
              </div>
              {isAdmin && (
                <form action={deleteCard.bind(null, matchId, card.id)}>
                  <button type="submit" className="text-xs font-medium text-steel/60">
                    Supprimer
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && <AddCardForm matchId={matchId} players={players} />}
    </section>
  );
}

function AddCardForm({ matchId, players }: { matchId: string; players: Player[] }) {
  return (
    <form
      action={addCard.bind(null, matchId)}
      className="mt-4 space-y-3 rounded-xl border border-white/10 bg-navy-card p-3"
    >
      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="player_id">
          Joueur
        </label>
        <select
          id="player_id"
          name="player_id"
          required
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        >
          <option value="">— Choisir —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.first_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="card_type">
          Type
        </label>
        <select
          id="card_type"
          name="card_type"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        >
          <option value="yellow">Jaune</option>
          <option value="red">Rouge</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="minute">
          Minute (optionnel)
        </label>
        <input
          id="minute"
          type="number"
          inputMode="numeric"
          name="minute"
          min={0}
          max={130}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-cream/80" htmlFor="comment">
          Commentaire (optionnel)
        </label>
        <input
          id="comment"
          type="text"
          name="comment"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream"
        />
      </div>

      <button type="submit" className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
        Ajouter le carton
      </button>
    </form>
  );
}
