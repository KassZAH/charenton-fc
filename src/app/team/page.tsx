import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getActivePlayers, getArchivedPlayers } from "@/lib/data/players";
import { setPlayerStatus } from "@/lib/data/players-actions";
import { isElevatedRole, type Player } from "@/types/models";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function TeamPage() {
  const user = await requireUser();
  const players = await getActivePlayers();
  const isAdmin = isElevatedRole(user.role);
  const archivedPlayers = isAdmin ? await getArchivedPlayers() : [];

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Équipe</h1>
        <div className="flex gap-2">
          <Button href="/dues" variant="secondary">
            {isAdmin ? "Cotisations" : "Ma cotisation"}
          </Button>
          {isAdmin && (
            <Button href="/team/new" variant="primary">
              + Ajouter un joueur
            </Button>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {players.map((player) => (
          <PlayerRow key={player.id} player={player} isAdmin={isAdmin} />
        ))}
      </ul>

      {isAdmin && archivedPlayers.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Joueurs archivés</h2>
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
    <li>
      <Card padding="sm" className={`flex items-center justify-between ${archived ? "opacity-60" : ""}`}>
        <Link href={`/team/${player.id}`} className="flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            {player.nickname || player.first_name}
            {player.shirt_number != null && (
              <span className="text-xs font-normal text-steel/70">#{player.shirt_number}</span>
            )}
            {player.role === "admin" && (
              <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-deep">
                Admin
              </span>
            )}
            {player.role === "coach" && (
              <span className="rounded-full border border-gold/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold">
                Coach
              </span>
            )}
          </p>
          <p className="text-xs text-steel/70">{player.primary_position || "—"}</p>
        </Link>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button href={`/team/${player.id}/edit`} variant="secondary">
              Modifier
            </Button>
            <form action={setPlayerStatus.bind(null, player.id, archived ? "active" : "archived")}>
              <Button type="submit" variant="secondary">
                {archived ? "Réactiver" : "Archiver"}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </li>
  );
}
