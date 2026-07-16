import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth/actions";
import type { SessionPayload } from "@/lib/auth/session";
import { BottomNav } from "./BottomNav";

export function AppShell({ user, children }: { user: SessionPayload; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-navy px-4 py-3">
        <Link href="/" className="font-bold text-gold">
          Charenton FC
        </Link>
        <form action={logout} className="flex items-center gap-3">
          <span className="text-sm text-white/80">{user.name}</span>
          <button
            type="submit"
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/90"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <BottomNav />
    </div>
  );
}
