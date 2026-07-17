import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - /login (page de connexion)
     * - fichiers statiques Next.js et assets
     * - manifest PWA et icônes (doivent rester accessibles sans session,
     *   sinon le navigateur ne peut pas proposer "Ajouter à l'écran d'accueil")
     * - /calendar/[token] (flux .ics abonnable — authentifié par token, pas de
     *   cookie possible puisque c'est l'appli calendrier qui vient le chercher)
     * - /renfort/[token] (appel à renfort — page publique envoyée à des non-membres)
     */
    "/((?!login|manifest\\.webmanifest|icon$|apple-icon$|icons/|calendar/|renfort/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
