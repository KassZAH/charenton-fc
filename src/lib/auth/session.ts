import { SignJWT, jwtVerify } from "jose";

/**
 * Ce fichier est importé à la fois par le middleware (runtime Edge) et par
 * les Server Actions (runtime Node) : il ne doit utiliser que des API
 * compatibles avec les deux, d'où l'usage de `jose` plutôt que `jsonwebtoken`.
 */

export const SESSION_COOKIE_NAME = "charenton_session";
const SESSION_DURATION = "180d";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET manquant dans les variables d'environnement");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  playerId: string;
  role: "player" | "admin";
  name: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.playerId !== "string" ||
      (payload.role !== "player" && payload.role !== "admin") ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return { playerId: payload.playerId, role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}
