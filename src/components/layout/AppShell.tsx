import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/auth/session";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { ToastProvider } from "@/components/ui/ToastProvider";

export function AppShell({ user, children }: { user: SessionPayload; children: ReactNode }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-navy px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link href="/" className="flex items-center gap-2 text-scoreboard font-extrabold text-gold">
            <Image src="/logo-charenton.png" alt="" width={28} height={28} className="h-7 w-7" />
            Charenton FC
          </Link>
          <Link
            href="/plus"
            aria-label={`Menu — connecté en tant que ${user.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 text-xs font-bold text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            {initial}
          </Link>
        </header>

        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomNav />
      </div>
    </ToastProvider>
  );
}
