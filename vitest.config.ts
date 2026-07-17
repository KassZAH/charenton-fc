import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
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
