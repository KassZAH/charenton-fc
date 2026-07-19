import fs from "node:fs";
import path from "node:path";

/**
 * Remet le dataset isolé dans un état propre et déterministe avant toute
 * suite E2E (roadmap V3, protocole macro-releases §10) — jamais de test qui
 * dépend de l'état laissé par un run précédent. Refuse de s'exécuter si les
 * identifiants ne pointent pas explicitement vers le projet isolé (voir
 * scripts/isolated-env/guard.js).
 */
export default async function globalSetup() {
  const envPath = path.join(__dirname, "..", ".env.integration.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resetAndSeed } = require("../scripts/isolated-env/reset-and-seed.js");
  await resetAndSeed();
}
