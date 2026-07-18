import { SignJWT, jwtVerify } from "jose";

/**
 * Ce fichier est importé à la fois par le middleware (runtime Edge) et par
 * les Server Actions (runtime Node) : il ne doit utiliser que des API
 * compatibles avec les deux, d'où l'usage de `jose` plutôt que `jsonwebtoken`.
 */

export const SESSION_COOKIE_NAME = "charenton_session";
const SESSION_DURATION = "30d";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET manquant dans les variables d'environnement");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  playerId: string;
  role: "player" | "admin" | "coach";
  name: string;
  /** true si playerId === team_settings.owner_player_id — jamais déduit du prénom, du rôle ou de l'ordre de création. */
  isOwner: boolean;
};

/**
 * Le JWT ne fait plus foi à lui seul pour le rôle/nom — seul playerId et
 * sessionVersion en sont extraits ici. getCurrentUser() (current-user.ts)
 * revérifie systématiquement le joueur en base et reconstruit le payload
 * avec les valeurs fraîches, ce qui permet de révoquer une session en
 * incrémentant session_version (changement de rôle, de PIN, archivage).
 */
export type RawSessionToken = {
  playerId: string;
  sessionVersion: number;
};

export async function signSession(payload: RawSessionToken): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<RawSessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.playerId !== "string" || typeof payload.sessionVersion !== "number") {
      return null;
    }
    return { playerId: payload.playerId, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}
