"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Rejoue un fondu léger à chaque changement de page (la clé force le remount). */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
