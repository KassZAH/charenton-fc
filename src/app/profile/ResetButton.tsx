"use client";

export function ResetButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const ok = confirm(
          "Tout réinitialiser ? Ça supprime définitivement tous les matchs, buts, cartons, présences, votes et badges. L'effectif et les adversaires restent. Irréversible."
        );
        if (!ok) e.preventDefault();
      }}
      className="w-full rounded-lg border border-red-400/30 bg-red-500/10 py-3 text-sm font-semibold text-red-300"
    >
      Tout réinitialiser (saison)
    </button>
  );
}
