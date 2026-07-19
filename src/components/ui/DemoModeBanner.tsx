import Link from "next/link";

/**
 * Mode Démo (présentation aux coachs) — bandeau fixe, visible mobile et desktop, sur toute page
 * montrant une donnée de la saison Démo. Toujours accompagné d'une sortie immédiate.
 */
export function DemoModeBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-gold px-3 py-2 text-xs font-bold text-navy-deep">
      <span>MODE DÉMO · Données fictives · Aucun changement n&apos;affecte le vrai club</span>
      <Link href="/" className="shrink-0 underline underline-offset-2">
        Quitter le mode Démo
      </Link>
    </div>
  );
}
