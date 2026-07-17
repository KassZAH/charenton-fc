import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getClubTimeline, getThisDayInHistory, getRandomMemory, getClubFounding } from "@/lib/data/club-memory";
import { updateClubFounding } from "@/lib/data/club-memory-actions";
import { formatMatchDate, formatShortDateOnly } from "@/lib/format";
import { isElevatedRole } from "@/types/models";

export default async function MemoirePage() {
  const user = await requireUser();
  const isAdmin = isElevatedRole(user.role);

  const [timeline, thisDay, randomMemory, founding] = await Promise.all([
    getClubTimeline(),
    getThisDayInHistory(),
    getRandomMemory(),
    isAdmin ? getClubFounding() : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Mémoire du club</h1>
        <Link href="/stats" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Stats
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium">
        <Link href="/memoire/hall-of-fame" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          🏆 Hall of Fame
        </Link>
        <Link href="/memoire/citations" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          💬 Citations
        </Link>
        <Link href="/memoire/maillots" className="rounded-full border border-white/15 px-3 py-1 text-cream/80">
          👕 Maillots
        </Link>
      </div>

      {thisDay && (
        <section className="mb-6 rounded-2xl border border-gold/15 bg-navy-mid p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">
            Ce jour-là, {formatMatchDate(thisDay.matchDate)}
          </h2>
          <MemoryCard memory={thisDay} />
        </section>
      )}

      {randomMemory && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-steel">Souvenir aléatoire</h2>
            <a href="/memoire" className="text-xs font-medium text-gold underline underline-offset-2">
              Un autre →
            </a>
          </div>
          <MemoryCard memory={randomMemory} />
        </section>
      )}

      {timeline.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Frise historique</h2>
          <ul className="space-y-1.5">
            {timeline.map((entry, i) => {
              const content = (
                <>
                  <p className="text-xs text-steel/70">{formatShortDateOnly(entry.date)}</p>
                  <p className="text-sm font-semibold text-cream">{entry.label}</p>
                  <p className="text-sm text-cream/80">{entry.detail}</p>
                </>
              );
              return (
                <li
                  key={`${entry.label}-${entry.date}-${i}`}
                  className="rounded-xl border border-white/10 bg-navy-card px-3 py-2"
                >
                  {entry.href ? (
                    <Link href={entry.href} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isAdmin && founding && (
        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="mb-3 text-sm font-bold text-cream">Création du club</h2>
          <form action={updateClubFounding} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="founded_date">
                Date de création
              </label>
              <input
                id="founded_date"
                type="date"
                name="founded_date"
                defaultValue={founding.founded_date ?? ""}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/80" htmlFor="founding_note">
                Note (facultatif)
              </label>
              <input
                id="founding_note"
                type="text"
                name="founding_note"
                defaultValue={founding.founding_note ?? ""}
                placeholder="Charenton FC voit le jour."
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
              />
            </div>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
              Enregistrer
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function MemoryCard({
  memory,
}: {
  memory: {
    matchId: string;
    opponentName: string;
    homeOrAway: string;
    teamScore: number | null;
    opponentScore: number | null;
    scorers: string[];
    anecdote: string | null;
  };
}) {
  const isHome = memory.homeOrAway === "home";
  return (
    <Link
      href={`/matches/${memory.matchId}`}
      className="block rounded-xl border border-white/10 bg-navy-card p-3"
    >
      <p className="text-sm font-semibold text-cream">
        {isHome ? "vs" : "@"} {memory.opponentName}
      </p>
      <p className="text-lg font-bold tabular-nums text-gold">
        {memory.teamScore}–{memory.opponentScore}
      </p>
      {memory.scorers.length > 0 && (
        <p className="text-sm text-cream/80">Buteurs : {memory.scorers.join(", ")}</p>
      )}
      {memory.anecdote && <p className="mt-1 text-sm italic text-steel/80">« {memory.anecdote} »</p>}
    </Link>
  );
}
