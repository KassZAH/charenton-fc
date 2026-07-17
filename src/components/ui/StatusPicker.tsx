const COLUMN_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export type StatusOption<T extends string> = { value: T; label: string };

export function StatusPicker<T extends string>({
  options,
  value,
  onSelect,
  disabled = false,
  columns = 2,
}: {
  options: StatusOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  disabled?: boolean;
  columns?: number;
}) {
  return (
    <div className={`grid gap-2 ${COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[2]}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.value)}
          className={`rounded-xl border py-3 text-sm font-bold transition disabled:opacity-60 ${
            value === opt.value
              ? "border-gold bg-gold/10 text-gold"
              : "border-white/15 bg-white/5 text-cream/80"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
