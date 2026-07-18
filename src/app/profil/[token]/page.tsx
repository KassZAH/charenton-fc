import { notFound } from "next/navigation";
import { getPlayerByPublicToken } from "@/lib/data/players";
import { getPlayerStats, getPlayerAwardWins } from "@/lib/data/player-stats";
import { getPlayerBadges } from "@/lib/data/badges";
import { formatShortDateOnly } from "@/lib/format";

function initials(firstName: string, lastName: string | null) {
  return (firstName[0] + (lastName?.[0] ?? "")).toUpperCase();
}

export default async function PublicProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const player = await getPlayerByPublicToken(token);
  if (!player) notFound();

  const [stats, awardWins, badges] = await Promise.all([
    getPlayerStats(player.id),
    getPlayerAwardWins(player.id),
    getPlayerBadges(player.id),
  ]);
  const trophyCount = awardWins.reduce((sum, w) => sum + w.wins, 0);

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        {player.photo_visibility === "public" && player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo_url}
            alt={player.nickname || player.first_name}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold/50 text-xl font-extrabold text-gold">
            {initials(player.first_name, player.last_name)}
          </span>
        )}
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-cream">
            {player.nickname || player.first_name}
            {player.shirt_number != null && (
              <span className="text-sm font-normal text-steel/70">#{player.shirt_number}</span>
            )}
          </h1>
          <p className="text-sm text-steel/70">{player.primary_position || "—"} · Charenton FC</p>
        </div>
      </div>

      {player.quote && (
        <p className="mb-6 rounded-xl border border-white/10 bg-navy-card p-3 text-sm italic text-cream/80">
          « {player.quote} »
        </p>
      )}

      {player.birthday_visibility === "public" && player.birthday && (
        <p className="mb-6 text-sm text-steel/70">🎂 {formatShortDateOnly(player.birthday)}</p>
      )}

      <section className="mb-6 rounded-2xl border border-white/10 bg-navy-card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Présences" value={stats.matchesPlayed} />
          <Stat label="Buts" value={stats.goals} />
          <Stat label="Passes déc." value={stats.assists} />
        </div>
      </section>

      {trophyCount > 0 && (
        <p className="mb-2 text-sm text-cream">🏆 {trophyCount} récompense{trophyCount > 1 ? "s" : ""} de match</p>
      )}
      {badges.length > 0 && (
        <p className="text-sm text-cream">
          {badges.length} badge{badges.length > 1 ? "s" : ""} débloqué{badges.length > 1 ? "s" : ""}
        </p>
      )}

      <p className="mt-8 text-center text-xs text-steel/50">Profil public Charenton FC</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums text-gold">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">{label}</p>
    </div>
  );
}
