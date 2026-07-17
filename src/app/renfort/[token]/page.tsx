import { notFound } from "next/navigation";
import { getPublicReinforcementCall } from "@/lib/data/reinforcement";
import { formatMatchDate, formatTime } from "@/lib/format";
import { REINFORCEMENT_POSITION_LABELS, type ReinforcementPosition } from "@/types/models";

export default async function ReinforcementCallPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicReinforcementCall(token);
  if (!data) notFound();

  const { call, matchDate, kickoffTime, location, opponentName, homeOrAway } = data;
  const isHome = homeOrAway === "home";
  const opponentLabel = opponentName ?? "adversaire à confirmer";
  const matchLabel = isHome ? `Charenton FC vs ${opponentLabel}` : `${opponentLabel} vs Charenton FC`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-lg font-extrabold text-navy-deep">
        CFC
      </div>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-gold">Appel à renfort</p>
      <h1 className="text-scoreboard mt-1 text-center text-2xl font-extrabold text-cream">
        Charenton FC cherche un {REINFORCEMENT_POSITION_LABELS[call.position_needed as ReinforcementPosition]}
      </h1>

      <div className="mt-6 rounded-2xl border border-gold/15 bg-navy-card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">Match</p>
        <p className="text-base font-bold text-cream">{matchLabel}</p>
        <p className="mt-1 text-sm text-steel">
          {formatMatchDate(matchDate)}
          {kickoffTime ? ` · ${formatTime(kickoffTime)}` : ""}
        </p>
        {location && <p className="text-sm text-steel">{location}</p>}
      </div>

      {call.message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-navy-card p-3 text-sm italic text-cream/80">
          « {call.message} »
        </p>
      )}

      <p className="mt-6 text-center text-xs text-steel/70">
        Si ça t&apos;intéresse, réponds directement à la personne qui t&apos;a envoyé ce lien.
      </p>
    </div>
  );
}
