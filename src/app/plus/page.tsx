import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { logout } from "@/lib/auth/actions";
import { isElevatedRole } from "@/types/models";

const CLUB_LINKS = [
  { href: "/trophees", label: "Trophées", emoji: "🏆" },
  { href: "/records", label: "Records", emoji: "📊" },
  { href: "/memoire", label: "Mémoire du club", emoji: "📖" },
];

export default async function PlusPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-scoreboard text-xl font-extrabold text-cream">Plus</h1>
      <p className="mb-6 text-sm text-steel/70">Connecté en tant que {user.name}</p>

      <MenuSection title="Club">
        {CLUB_LINKS.map((item) => (
          <MenuLink key={item.href} {...item} />
        ))}
      </MenuSection>

      <MenuSection title="Perso">
        <MenuLink href="/profile" label="Profil" emoji="👤" />
        <MenuLink href="/dues" label="Cotisations" emoji="💳" />
      </MenuSection>

      {isElevatedRole(user.role) && (
        <MenuSection title="Administration">
          <MenuLink href="/admin" label="Administration" emoji="⚙️" />
        </MenuSection>
      )}

      <MenuSection title="Assistance">
        <MenuLink href="/help" label="Aide" emoji="❓" />
      </MenuSection>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-cream/80"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function MenuLink({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-card p-3 text-sm font-semibold text-cream"
      >
        <span className="text-lg" aria-hidden="true">
          {emoji}
        </span>
        {label}
      </Link>
    </li>
  );
}
