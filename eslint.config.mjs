import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts CLI Node autonomes (roadmap V3, Lot 9) — CommonJS par conception (pas de
    // build step), en dehors du périmètre applicatif TS/ESM couvert par ce lint.
    "scripts/**",
  ]),
]);

export default eslintConfig;
