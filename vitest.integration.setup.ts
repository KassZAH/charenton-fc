import fs from "node:fs";
import path from "node:path";

// Charge .env.integration.local s'il existe (usage local) — en CI, les variables
// sont déjà injectées directement dans process.env (secrets GitHub Actions),
// jamais lues depuis un fichier.
const envPath = path.join(__dirname, ".env.integration.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertIsolatedProjectEnv } = require("./scripts/isolated-env/guard.js");
assertIsolatedProjectEnv();
