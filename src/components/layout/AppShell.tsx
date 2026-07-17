import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth/actions";
import type { SessionPayload } from "@/lib/auth/session";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { ToastProvider } from "@/components/ui/ToastProvider";

export function AppShell({ user, children }: { user: SessionPayload; children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-navy px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-scoreboard font-extrabold text-gold">
            <Image src="/logo-charenton.png" alt="" width={28} height={28} className="h-7 w-7" />
            Charenton FC
          </Link>
          <form action={logout} className="flex items-center gap-3">
            <Link
              href="/help"
              aria-label="Aide"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-xs font-bold text-white/80"
            >
              ?
            </Link>
            <Link href="/profile" className="text-sm text-white/80 underline-offset-2 hover:underline">
              {user.name}
            </Link>
            <button
              type="submit"
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/90"
            >
              Déconnexion
            </button>
          </form>
        </header>

        <main className="flex-1 pb-20">
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomNav />
      </div>
    </ToastProvider>
  );
}
