import { getReinforcementCallsForMatch } from "@/lib/data/reinforcement";
import { createReinforcementCall, revokeReinforcementCall } from "@/lib/data/reinforcement-actions";
import { REINFORCEMENT_POSITION_LABELS, type ReinforcementPosition } from "@/types/models";
import { WhatsAppShareButton } from "@/components/ui/WhatsAppShareButton";
import { Button } from "@/components/ui/Button";

export async function ReinforcementSection({
  matchId,
  origin,
  matchLabel,
}: {
  matchId: string;
  origin: string;
  matchLabel: string;
}) {
  const calls = await getReinforcementCallsForMatch(matchId);
  const now = new Date();

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-3 text-sm font-bold text-cream">Appel à renfort</h2>

      {calls.length > 0 && (
        <ul className="mb-4 space-y-2">
          {calls.map((call) => {
            const positionLabel = REINFORCEMENT_POSITION_LABELS[call.position_needed as ReinforcementPosition];
            const isRevoked = !!call.revoked_at;
            const isExpired = call.expires_at ? new Date(call.expires_at) < now : false;
            const isActive = !isRevoked && !isExpired;
            const url = `${origin}/renfort/${call.token}`;

            return (
              <li key={call.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-cream">{positionLabel}</p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      isActive ? "text-emerald-400" : "text-steel/60"
                    }`}
                  >
                    {isRevoked ? "Révoqué" : isExpired ? "Expiré" : "Actif"}
                  </span>
                </div>
                {call.message && <p className="mb-2 text-xs text-steel">{call.message}</p>}
                {isActive && (
                  <div className="flex flex-wrap gap-2">
                    <WhatsAppShareButton
                      text={`⚽ On cherche un ${positionLabel.toLowerCase()} pour ${matchLabel} ! Plus d'infos : ${url}`}
                    >
                      Partager
                    </WhatsAppShareButton>
                    <form action={revokeReinforcementCall.bind(null, matchId, call.id)}>
                      <Button type="submit" variant="danger">
                        Révoquer
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={createReinforcementCall.bind(null, matchId)}
        className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3"
      >
        <div>
          <label className="block text-xs font-medium text-cream/80" htmlFor="position_needed">
            Poste recherché
          </label>
          <select
            id="position_needed"
            name="position_needed"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="gardien">Gardien</option>
            <option value="defenseur">Défenseur</option>
            <option value="joueur_de_champ">Joueur de champ</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-cream/80" htmlFor="duration">
            Durée du lien
          </label>
          <select
            id="duration"
            name="duration"
            defaultValue="permanent"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="permanent">Permanent (jusqu&apos;à révocation)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-cream/80" htmlFor="message">
            Message (facultatif)
          </label>
          <input
            id="message"
            name="message"
            type="text"
            placeholder="ex. niveau loisir, ambiance sympa"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </div>
        <Button type="submit" variant="primary" shape="block">
          Créer le lien
        </Button>
      </form>
    </section>
  );
}
