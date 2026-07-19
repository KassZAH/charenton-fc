import Link from "next/link";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { getAllSeasons, getOpenMatchesInActiveSeason } from "@/lib/data/seasons";
import { getMatchesNeedingReviewForSeason } from "@/lib/data/match-completeness";
import { toggleSeasonLock } from "@/lib/data/seasons-actions";
import { getActivePlayers } from "@/lib/data/players";
import { formatShortDateOnly, formatMatchDate } from "@/lib/format";
import type { Player } from "@/types/models";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";
import { CloseSeasonForm } from "./CloseSeasonForm";
import { ArchivePlayerButton } from "./ArchivePlayerButton";

/**
 * Choisir qui archiver est une action à enjeu : contrairement au reste de
 * l'app (nickname || first_name, ambigu si plusieurs joueurs partagent un
 * prénom générique — cas du dataset fictif du Lot 7 : "Coach"/"Joueur" pour
 * tout le monde), cette liste affiche toujours le nom complet, avec le
 * pseudo en avant s'il existe.
 */
function archivePlayerLabel(p: Player): string {
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return p.nickname ? `${p.nickname} (${fullName})` : fullName;
}

export default async function SeasonsPage() {
  const user = await requireFreshCoach();
  const [seasons, players] = await Promise.all([getAllSeasons(), getActivePlayers()]);
  const activeSeason = seasons.find((s) => s.is_active) ?? null;

  const [openMatches, incompleteMatches] = await Promise.all([
    getOpenMatchesInActiveSeason(),
    activeSeason ? getMatchesNeedingReviewForSeason(activeSeason.id) : Promise.resolve([]),
  ]);

  return (
    <ResponsivePageContainer size="wide">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Saisons</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <ul className="mb-6 space-y-2">
        {seasons.map((s) => (
          <li key={s.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cream">
                  {s.name} {s.is_active && <span className="text-gold">· active</span>}
                </p>
                <p className="text-xs text-steel/70">
                  {s.start_date ? formatShortDateOnly(s.start_date) : "—"} →{" "}
                  {s.end_date ? formatShortDateOnly(s.end_date) : "—"}
                </p>
                <Link
                  href={`/season-recap?seasonId=${s.id}`}
                  className="mt-1 inline-block text-xs font-medium text-gold underline underline-offset-2"
                >
                  Voir le bilan
                </Link>
              </div>
              {user.isOwner ? (
                <form action={toggleSeasonLock.bind(null, s.id, !s.is_locked)}>
                  <button
                    type="submit"
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      s.is_locked ? "border-gold/40 text-gold" : "border-white/15 text-cream/80"
                    }`}
                  >
                    {s.is_locked ? "🔒 Verrouillée" : "🔓 Déverrouillée"}
                  </button>
                </form>
              ) : (
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-steel/60">
                  {s.is_locked ? "🔒 Verrouillée" : "🔓 Déverrouillée"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!user.isOwner && (
        <p className="mb-6 rounded-xl border border-white/10 bg-navy-card p-3 text-xs text-steel/70">
          Consultation seule — le verrouillage des saisons et la clôture de saison sont réservés au propriétaire du
          club.
        </p>
      )}

      {user.isOwner && activeSeason && (
        <section className="mb-6 border-t border-white/10 pt-6">
          <h2 className="mb-3 text-sm font-bold text-cream">Clôturer « {activeSeason.name} »</h2>

          {openMatches.length > 0 && (
            <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
              ⚠️ {openMatches.length} match{openMatches.length > 1 ? "s" : ""} pas encore joué
              {openMatches.length > 1 ? "s" : ""} :
              <ul className="mt-1 list-inside list-disc">
                {openMatches.map((m) => (
                  <li key={m.id}>{formatMatchDate(m.matchDate)}</li>
                ))}
              </ul>
            </div>
          )}

          {incompleteMatches.length > 0 && (
            <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
              ⚠️ {incompleteMatches.length} match{incompleteMatches.length > 1 ? "s" : ""} terminé
              {incompleteMatches.length > 1 ? "s" : ""} mais incomplet{incompleteMatches.length > 1 ? "s" : ""} :
              <ul className="mt-1 list-inside list-disc">
                {incompleteMatches.map((r) => (
                  <li key={r.match.id}>
                    {formatMatchDate(r.match.match_date)} — {r.completeness.percent}%
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-3 text-xs text-steel/60">
            Crée une sauvegarde protégée, verrouille « {activeSeason.name} » puis démarre la nouvelle saison. Les
            statistiques par saison sont toujours recalculées à la volée : rien d&apos;autre à réinitialiser.
          </p>

          <CloseSeasonForm
            oldSeasonId={activeSeason.id}
            oldSeasonName={activeSeason.name}
            activePlayers={players
              .filter((p) => p.id !== user.playerId)
              .map((p) => ({ id: p.id, name: archivePlayerLabel(p) }))}
          />
        </section>
      )}

      <section className="border-t border-white/10 pt-6">
        <h2 className="mb-1 text-sm font-bold text-cream">Effectif</h2>
        <p className="mb-3 text-xs text-steel/70">
          Archive les joueurs qui ne reviennent pas — leur historique reste intact, ils disparaissent juste des
          listes actives.
        </p>
        <ul className="space-y-1.5">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2">
              <span className="text-sm text-cream">{p.nickname || p.first_name}</span>
              <ArchivePlayerButton playerId={p.id} playerName={p.nickname || p.first_name} />
            </li>
          ))}
        </ul>
      </section>
    </ResponsivePageContainer>
  );
}
