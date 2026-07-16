"use client";

import { useEffect, useState, useTransition } from "react";
import { login } from "@/lib/auth/actions";
import { pinLengthForRole, type PlayerRole } from "@/types/models";

type LoginPlayer = {
  id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  role: PlayerRole;
};

function initials(player: LoginPlayer) {
  const first = player.first_name?.[0] ?? "";
  const last = player.last_name?.[0] ?? "";
  return (first + last).toUpperCase();
}

function displayName(player: LoginPlayer) {
  return player.nickname || player.first_name;
}

export function LoginScreen({ players }: { players: LoginPlayer[] }) {
  const [selected, setSelected] = useState<LoginPlayer | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-navy text-2xl font-bold text-gold">
          CFC
        </div>
        <h1 className="text-xl font-bold text-navy">Charenton FC</h1>
        <p className="text-sm text-navy/60">
          {selected ? "Entre ton code" : "Qui es-tu ?"}
        </p>
      </div>

      {selected ? (
        <PinStep player={selected} onBack={() => setSelected(null)} />
      ) : (
        <PlayerGrid players={players} onSelect={setSelected} />
      )}
    </div>
  );
}

function PlayerGrid({
  players,
  onSelect,
}: {
  players: LoginPlayer[];
  onSelect: (player: LoginPlayer) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {players.map((player) => (
        <button
          key={player.id}
          type="button"
          onClick={() => onSelect(player)}
          className="flex flex-col items-center gap-2 rounded-xl border border-navy/10 bg-white p-3 text-center shadow-sm active:scale-95 transition"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-sm font-semibold text-gold">
            {initials(player)}
          </span>
          <span className="text-xs font-medium text-navy leading-tight">
            {displayName(player)}
          </span>
        </button>
      ))}
    </div>
  );
}

function PinStep({
  player,
  onBack,
}: {
  player: LoginPlayer;
  onBack: () => void;
}) {
  const expectedLength = pinLengthForRole(player.role);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (pin.length !== expectedLength) return;
    startTransition(async () => {
      const result = await login(player.id, pin);
      if (result?.error) {
        setError(result.error);
        setPin("");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function pressDigit(digit: string) {
    if (isPending) return;
    setError(null);
    setPin((prev) => (prev.length < expectedLength ? prev + digit : prev));
  }

  function pressBackspace() {
    if (isPending) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-4 text-center font-semibold text-navy">
        {displayName(player)}
      </p>

      <div className="mb-6 flex gap-3">
        {Array.from({ length: expectedLength }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 border-navy ${
              i < pin.length ? "bg-navy" : "bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => pressDigit(digit)}
            disabled={isPending}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-navy/5 text-xl font-semibold text-navy active:bg-navy/15 disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => pressDigit("0")}
          disabled={isPending}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-navy/5 text-xl font-semibold text-navy active:bg-navy/15 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={pressBackspace}
          disabled={isPending}
          aria-label="Effacer"
          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-navy/60 active:bg-navy/10 disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={isPending}
        className="mt-8 text-sm font-medium text-navy/60 underline underline-offset-2"
      >
        Ce n&apos;est pas moi
      </button>
    </div>
  );
}
