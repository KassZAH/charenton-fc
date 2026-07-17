import Link from "next/link";

type Option = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};

export function InlineChoicePanel({ message, options }: { message: string; options: Option[] }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
      <p className="mb-3 text-sm text-cream">{message}</p>
      <div className="space-y-1.5">
        {options.map((opt) =>
          opt.href ? (
            <Link
              key={opt.label}
              href={opt.href}
              className="block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-medium text-cream/90"
            >
              {opt.label}
            </Link>
          ) : (
            <button
              key={opt.label}
              type="button"
              disabled={opt.disabled}
              onClick={opt.onClick}
              className="block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-medium text-cream/90 disabled:opacity-60"
            >
              {opt.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
