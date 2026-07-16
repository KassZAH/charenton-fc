import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getActivePlayers, getArchivedPlayers } from "@/lib/data/players";
import { setPlayerStatus } from "@/lib/data/players-actions";
import type { Player } from "@/types/models";

export default async function TeamPage() {
  const user = await requireUser();
  const players = await getActivePlayers();
  const archivedPlayers = user.role === "admin" ? await getArchivedPlayers() : [];

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy">Équipe</h1>
        {user.role === "admin" && (
          <Link
            href="/team/new"
            className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-gold"
          >
            + Ajouter un joueur
          </Link>
        )}
      </div>

      <ul className="space-y-2">
        {players.map((player) => (
          <PlayerRow key={player.id} player={player} isAdmin={user.role === "admin"} />
        ))}
      </ul>

      {user.role === "admin" && archivedPlayers.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-navy/60">Joueurs archivés</h2>
          <ul className="space-y-2">
            {archivedPlayers.map((player) => (
              <PlayerRow key={player.id} player={player} isAdmin archived />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  isAdmin,
  archived = false,
}: {
  player: Player;
  isAdmin: boolean;
  archived?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded-xl border border-navy/10 bg-white p-3 ${
        archived ? "opacity-60" : ""
      }`}
    >
      <Link href={`/team/${player.id}`} className="flex-1">
        <p className="text-sm font-semibold text-navy">
          {player.nickname || player.first_name}
          {player.shirt_number != null && (
            <span className="ml-2 text-xs font-normal text-navy/50">#{player.shirt_number}</span>
          )}
        </p>
        <p className="text-xs text-navy/50">
          {[player.primary_position, player.role === "admin" ? "Admin" : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </Link>
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Link
            href={`/team/${player.id}/edit`}
            className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/60"
          >
            Modifier
          </Link>
          <form action={setPlayerStatus.bind(null, player.id, archived ? "active" : "archived")}>
            <button
              type="submit"
              className="rounded-full border border-navy/20 px-3 py-1 text-xs font-medium text-navy/60"
            >
              {archived ? "Réactiver" : "Archiver"}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
