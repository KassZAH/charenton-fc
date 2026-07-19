import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Roadmap V3, Lot 12 (Macro-release A, §2.1 du protocole) — socle E2E
 * réutilisable. Vise exclusivement une preview ou le projet Supabase isolé
 * (cimbymuifzooxrnenznd) — jamais le projet partagé, jamais de secret de
 * production. Si PLAYWRIGHT_BASE_URL est déjà défini (preview déployée),
 * aucun serveur n'est démarré ici ; sinon un `next dev` local est lancé
 * avec les identifiants isolés lus depuis .env.integration.local.
 */

function parseDotEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const isolatedEnv = parseDotEnv(path.join(__dirname, ".env.integration.local"));
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  fullyParallel: false, // dataset isolé partagé entre les tests d'un même run — jamais deux specs en parallèle sur les mêmes fixtures.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Captures uniquement en cas d'échec (roadmap V3, §2.1) — jamais un artefact pour un test vert.
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: {
          // process.env d'abord (CI : secrets injectés par le workflow), .env.integration.local
          // ensuite en local ne l'écrase que s'il est absent de l'environnement du process.
          ...isolatedEnv,
          ...process.env,
          PORT: "3100",
        } as Record<string, string>,
      },
});
