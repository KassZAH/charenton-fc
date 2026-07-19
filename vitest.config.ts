import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Les tests d'intégration (Lot 9, vitest.integration.config.ts) ont leur propre
    // commande et leurs propres identifiants réels — jamais mélangés à la suite
    // unitaire, qui n'utilise que les identifiants factices définis ci-dessous.
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    env: {
      // Dummy — certains modules server-only instancient un client Supabase à l'import.
      // Ces valeurs ne sont jamais utilisées pour un vrai appel réseau dans les tests.
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Le paquet "server-only" jette une erreur sur son entrée par défaut (prévu pour être
      // intercepté par le bundler Next.js) — en test on veut la variante no-op qu'il fournit lui-même.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
