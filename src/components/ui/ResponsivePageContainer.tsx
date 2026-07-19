import type { ReactNode } from "react";

const SIZE_CLASSES = {
  narrow: "lg:max-w-2xl",
  wide: "lg:max-w-5xl",
  full: "lg:max-w-6xl",
} as const;

/**
 * Conteneur de page réutilisable (roadmap V3, Lot 10/11) — remplace le
 * motif dupliqué `mx-auto max-w-md lg:max-w-2xl px-4 py-6` présent dans les
 * ~39 pages. Les safe areas (haut/bas) et l'espace pour la navigation fixe
 * sont déjà gérés par AppShell (header/main/BottomNav) — ce conteneur ne
 * gère que la largeur et les marges internes du contenu.
 */
export function ResponsivePageContainer({
  size = "narrow",
  className = "",
  children,
}: {
  /** narrow (défaut, contenu en une colonne) · wide (max-w-5xl) · full (max-w-6xl, tableaux/panneaux admin) */
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  children: ReactNode;
}) {
  return <div className={`mx-auto max-w-md px-4 py-6 ${SIZE_CLASSES[size]} ${className}`}>{children}</div>;
}
