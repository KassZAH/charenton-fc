import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Config séparée pour les tests d'intégration (roadmap V3, Lot 9) — jamais
 * incluse dans `npm test` (vitest.config.ts garde son périmètre "fonctions
 * pures uniquement" avec des identifiants factices). Ces tests exigent de
 * vrais identifiants du projet Supabase isolé, chargés par setup.integration.ts,
 * qui refuse aussi de démarrer si l'environnement n'est pas exactement celui
 * du projet isolé autorisé (voir scripts/isolated-env/guard.js).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    // Les tests d'intégration partagent un dataset fictif sur un seul projet isolé :
    // jamais deux fichiers en parallèle pour éviter que deux runs se marchent dessus.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
