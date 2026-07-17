import type { SelectHTMLAttributes } from "react";

export type PlayerOption = { id: string; name: string };

type PlayerSelectProps = {
  players: PlayerOption[];
  label?: string;
  placeholder?: string;
  disabledIds?: Set<string>;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function PlayerSelect({
  players,
  label,
  placeholder = "— Choisir —",
  disabledIds,
  id,
  name,
  className = "",
  ...rest
}: PlayerSelectProps) {
  const fieldId = id ?? name;
  const select = (
    <select
      id={fieldId}
      name={name}
      className={`w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none disabled:opacity-60 ${className}`}
      {...rest}
    >
      <option value="">{placeholder}</option>
      {players.map((p) => (
        <option key={p.id} value={p.id} disabled={disabledIds?.has(p.id)}>
          {p.name}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <div>
      <label className="block text-xs font-medium text-cream/80" htmlFor={fieldId}>
        {label}
      </label>
      <div className="mt-1">{select}</div>
    </div>
  );
}
