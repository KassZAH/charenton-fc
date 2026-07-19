import { isMatchInDemoSeason } from "@/lib/data/demo-scope";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";

/**
 * Enveloppe toutes les sous-pages d'un match (fiche, live, édition, composition) sans les
 * modifier — ajout volontairement séparé du contenu existant (Mode Démo, post-Macro B) pour ne
 * courir aucun risque de régression sur les vraies fiches de match.
 */
export default async function MatchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isDemo = await isMatchInDemoSeason(id).catch(() => false);

  return (
    <>
      {isDemo && <DemoModeBanner />}
      {children}
    </>
  );
}
