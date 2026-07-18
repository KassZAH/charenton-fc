"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { login } from "@/lib/auth/actions";
import { pinLengthForRole, type PlayerRole } from "@/types/models";

type LoginPlayer = {
  id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  role: PlayerRole;
};

const LAST_PLAYER_STORAGE_KEY = "charenton_last_player_id";

function initials(player: LoginPlayer) {
  const first = player.first_name?.[0] ?? "";
  const last = player.last_name?.[0] ?? "";
  return (first + last).toUpperCase();
}

function displayName(player: LoginPlayer) {
  return player.nickname || player.first_name;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function LoginScreen({ players }: { players: LoginPlayer[] }) {
  const [selected, setSelected] = useState<LoginPlayer | null>(null);
  const [lastPlayerId, setLastPlayerId] = useState<string | null>(null);

  useEffect(() => {
    // Lu après le montage (jamais pendant le SSR) pour éviter un décalage d'hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastPlayerId(window.localStorage.getItem(LAST_PLAYER_STORAGE_KEY));
  }, []);

  function selectPlayer(player: LoginPlayer) {
    window.localStorage.setItem(LAST_PLAYER_STORAGE_KEY, player.id);
    setSelected(player);
  }

  const lastPlayer = players.find((p) => p.id === lastPlayerId) ?? null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-4 py-8">
      <div className="mb-8 text-center">
        <Image
          src="/logo-charenton.png"
          alt="Charenton FC"
          width={112}
          height={112}
          priority
          className="mx-auto mb-3 h-28 w-28 drop-shadow-[0_8px_24px_rgba(240,185,58,0.25)]"
        />
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Charenton FC</h1>
        <p className="text-sm text-steel">
          {selected ? "Entre ton code" : "Qui es-tu ?"}
        </p>
      </div>

      {selected ? (
        <PinStep player={selected} onBack={() => setSelected(null)} />
      ) : (
        <PlayerPicker players={players} lastPlayer={lastPlayer} onSelect={selectPlayer} />
      )}
    </div>
  );
}

function PlayerPicker({
  players,
  lastPlayer,
  onSelect,
}: {
  players: LoginPlayer[];
  lastPlayer: LoginPlayer | null;
  onSelect: (player: LoginPlayer) => void;
}) {
  const [query, setQuery] = useState("");
  const showSearch = players.length > 12;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return players;
    return players.filter((p) => normalize(displayName(p)).includes(q) || normalize(p.last_name ?? "").includes(q));
  }, [players, query]);

  return (
    <div>
      {lastPlayer && !query && (
        <button
          type="button"
          onClick={() => onSelect(lastPlayer)}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-left active:scale-[0.99] transition"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/50 text-sm font-bold text-gold">
            {initials(lastPlayer)}
          </span>
          <span className="text-sm">
            <span className="block text-cream/70">Continuer en tant que</span>
            <span className="block font-semibold text-cream">{displayName(lastPlayer)}</span>
          </span>
        </button>
      )}

      {showSearch && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un joueur…"
          aria-label="Rechercher un joueur"
          className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
        />
      )}

      <PlayerGrid players={filtered} onSelect={onSelect} />
      {filtered.length === 0 && <p className="text-center text-sm text-steel/70">Aucun joueur trouvé.</p>}
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
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-navy-card p-3 text-center active:scale-95 transition"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 text-sm font-bold text-gold">
            {initials(player)}
          </span>
          <span className="text-xs font-medium text-cream leading-tight">
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
      <p className="mb-4 text-center font-semibold text-cream">
        {displayName(player)}
      </p>

      <div className="mb-6 flex gap-3" role="status">
        {Array.from({ length: expectedLength }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-3.5 w-3.5 rounded-full border-2 border-gold ${
              i < pin.length ? "bg-gold" : "bg-transparent"
            }`}
          />
        ))}
        <span className="sr-only">
          {pin.length} chiffre{pin.length > 1 ? "s" : ""} saisi{pin.length > 1 ? "s" : ""} sur {expectedLength}
        </span>
      </div>

      {error && (
        <p className="mb-4 text-sm font-medium text-red-400" role="alert">
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
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-xl font-semibold text-cream active:bg-white/15 disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => pressDigit("0")}
          disabled={isPending}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-xl font-semibold text-cream active:bg-white/15 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={pressBackspace}
          disabled={isPending}
          aria-label="Effacer"
          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-steel active:bg-white/10 disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={isPending}
        className="mt-8 text-sm font-medium text-steel underline underline-offset-2"
      >
        Ce n&apos;est pas moi
      </button>
    </div>
  );
}
