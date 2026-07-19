"use client";

import { useMemo, useState, useTransition } from "react";
import { insertGoalsBatch, cancelGoalsBatch, type BatchGoalPayload } from "@/lib/data/batch-goals-actions";

type PlayerOption = { id: string; name: string };

function NumberField({ value, onChange, label }: { value: number; onChange: (n: number) => void; label?: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={value || ""}
      placeholder="0"
      aria-label={label}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="w-14 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center text-sm text-cream"
    />
  );
}

/**
 * Saisie groupée des buts (roadmap V3, Lot 18) — pour un match terminé non
 * suivi en direct. Aperçu obligatoire avant validation, transaction unique
 * côté serveur, annulation du lot complet possible juste après.
 */
export function BatchGoalEntryForm({ matchId, players }: { matchId: string; players: PlayerOption[] }) {
  const [scorerCounts, setScorerCounts] = useState<Record<string, number>>({});
  const [unknownScorerCount, setUnknownScorerCount] = useState(0);
  const [cscAdverseCount, setCscAdverseCount] = useState(0);
  const [cscCharentonCounts, setCscCharentonCounts] = useState<Record<string, number>>({});
  const [assistCounts, setAssistCounts] = useState<Record<string, number>>({});
  const [opponentScore, setOpponentScore] = useState(0);
  const [step, setStep] = useState<"form" | "preview" | "done">("form");
  const [result, setResult] = useState<{ batchId: string; teamScore: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const nameById = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);

  const payload: BatchGoalPayload = useMemo(
    () => ({
      idempotencyKey,
      scorerEntries: [
        ...Object.entries(scorerCounts).filter(([, c]) => c > 0).map(([playerId, count]) => ({ playerId, isUnknownScorer: false, count })),
        ...(unknownScorerCount > 0 ? [{ playerId: null, isUnknownScorer: true, count: unknownScorerCount }] : []),
      ],
      cscAdverseCount,
      cscCharentonEntries: Object.entries(cscCharentonCounts).filter(([, c]) => c > 0).map(([playerId, count]) => ({ playerId, count })),
      assistEntries: Object.entries(assistCounts).filter(([, c]) => c > 0).map(([playerId, count]) => ({ playerId, count })),
      opponentScore,
    }),
    [scorerCounts, unknownScorerCount, cscAdverseCount, cscCharentonCounts, assistCounts, opponentScore, idempotencyKey]
  );

  const teamScorePreview =
    payload.scorerEntries.reduce((sum, e) => sum + e.count, 0) + payload.cscAdverseCount;
  const totalGoals = teamScorePreview + payload.cscCharentonEntries.reduce((sum, e) => sum + e.count, 0);

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await insertGoalsBatch(matchId, payload);
        setResult({ batchId: r.batchId, teamScore: r.teamScore });
        setStep("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de la saisie.");
        setStep("form");
      }
    });
  }

  function cancelBatch() {
    if (!result) return;
    startTransition(async () => {
      await cancelGoalsBatch(matchId, result.batchId);
      setResult(null);
      setStep("form");
    });
  }

  if (step === "done" && result) {
    return (
      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-2 text-sm font-bold text-cream">Saisie groupée</h2>
        <p className="mb-3 text-sm text-emerald-400">
          ✅ Enregistré — score final {result.teamScore} – {opponentScore}.
        </p>
        <button
          type="button"
          onClick={cancelBatch}
          disabled={isPending}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-cream/80"
        >
          Annuler tout le lot
        </button>
      </section>
    );
  }

  if (step === "preview") {
    return (
      <section className="mt-8 border-t border-white/10 pt-6">
        <h2 className="mb-2 text-sm font-bold text-cream">Aperçu avant validation</h2>
        <ul className="mb-4 space-y-1 text-sm text-cream">
          {payload.scorerEntries.map((e) => (
            <li key={`${e.playerId}-${e.isUnknownScorer}`}>
              {e.isUnknownScorer ? "Buteur inconnu" : nameById.get(e.playerId!) ?? "Joueur"} : {e.count} but{e.count > 1 ? "s" : ""}
            </li>
          ))}
          {cscAdverseCount > 0 && <li>CSC adverse : {cscAdverseCount}</li>}
          {payload.cscCharentonEntries.map((e) => (
            <li key={e.playerId}>CSC — {e.playerId ? nameById.get(e.playerId) : "non précisé"} : {e.count}</li>
          ))}
          {payload.assistEntries.map((e) => (
            <li key={e.playerId} className="text-steel">
              Passe(s) — {nameById.get(e.playerId!) ?? "Joueur"} : {e.count}
            </li>
          ))}
        </ul>
        <p className="mb-4 text-sm font-bold text-gold">
          Score final : Charenton {totalGoals} – {opponentScore} adversaire
        </p>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep("form")} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-cream/80">
            Modifier
          </button>
          <button type="button" onClick={confirm} disabled={isPending} className="flex-1 rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep disabled:opacity-60">
            {isPending ? "Enregistrement..." : "Confirmer"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <h2 className="mb-1 text-sm font-bold text-cream">Saisie groupée des buts</h2>
      <p className="mb-3 text-xs text-steel/70">Pour un match terminé non suivi en direct — compteurs par joueur.</p>

      <div className="mb-3 grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] items-center gap-x-2 gap-y-1.5 text-xs font-bold uppercase tracking-wide text-steel/70">
        <span />
        <span className="text-center">Buts</span>
        <span className="text-center">Passes</span>
        <span className="text-center">CSC</span>
      </div>
      {players.map((p) => (
        <div key={p.id} className="mb-1.5 grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] items-center gap-x-2">
          <span className="text-sm text-cream">{p.name}</span>
          <NumberField value={scorerCounts[p.id] ?? 0} onChange={(n) => setScorerCounts((s) => ({ ...s, [p.id]: n }))} label={`Buts ${p.name}`} />
          <NumberField value={assistCounts[p.id] ?? 0} onChange={(n) => setAssistCounts((s) => ({ ...s, [p.id]: n }))} label={`Passes ${p.name}`} />
          <NumberField value={cscCharentonCounts[p.id] ?? 0} onChange={(n) => setCscCharentonCounts((s) => ({ ...s, [p.id]: n }))} label={`CSC ${p.name}`} />
        </div>
      ))}

      <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-navy-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-cream">Buteur inconnu</span>
          <NumberField value={unknownScorerCount} onChange={setUnknownScorerCount} label="Buteur inconnu" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-cream">CSC adverse (pour nous)</span>
          <NumberField value={cscAdverseCount} onChange={setCscAdverseCount} label="CSC adverse" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-cream">Score adverse</span>
          <NumberField value={opponentScore} onChange={setOpponentScore} label="Score adverse" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setStep("preview")}
        disabled={totalGoals === 0}
        className="mt-4 w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep disabled:opacity-40"
      >
        Voir l&apos;aperçu
      </button>
    </section>
  );
}
