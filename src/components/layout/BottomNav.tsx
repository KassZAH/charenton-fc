"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Accueil" },
  { href: "/matches", label: "Matchs" },
  { href: "/team", label: "Équipe" },
  { href: "/stats", label: "Stats" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-navy">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors duration-200 ${
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
