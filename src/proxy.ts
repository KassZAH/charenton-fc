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
     */
    "/((?!login|manifest\\.webmanifest|icon$|apple-icon$|icons/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
