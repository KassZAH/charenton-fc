"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; matchPrefixes?: string[] };

const TABS: Tab[] = [
  { href: "/", label: "Accueil" },
  { href: "/matches", label: "Matchs" },
  { href: "/team", label: "Équipe" },
  { href: "/stats", label: "Stats" },
  {
    href: "/plus",
    label: "Plus",
    // Onglet "fourre-tout" : actif aussi depuis les pages qu'il regroupe.
    matchPrefixes: ["/plus", "/trophees", "/records", "/memoire", "/dues", "/admin", "/help", "/profile"],
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-navy pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md lg:max-w-2xl">
        {TABS.map((tab) => {
          const prefixes = tab.matchPrefixes ?? [tab.href];
          const active = tab.href === "/" ? pathname === "/" : prefixes.some((p) => pathname.startsWith(p));
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:-outline-offset-2 ${
                  active ? "text-cream" : "text-steel/50"
                }`}
              >
                <span
                  className={`h-1 rounded-full bg-gold transition-all duration-200 ${
                    active ? "w-6 scale-100 opacity-100" : "w-6 scale-x-0 opacity-0"
                  }`}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
