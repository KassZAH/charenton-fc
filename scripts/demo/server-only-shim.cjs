/**
 * Neutralise le paquet "server-only" pour l'exécution via `npx tsx` (contexte Node pur, sans le
 * bundler Next.js qui l'alias normalement vers un no-op pour les Server Components — voir
 * vitest.config.ts qui fait la même chose pour les tests). Préchargé via NODE_OPTIONS.
 */
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
