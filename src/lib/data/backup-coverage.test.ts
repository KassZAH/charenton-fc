import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { BACKUP_TABLES, BACKUP_EXCLUDED_TABLES } from "./backups";

/**
 * Test d'intégration délibérément hors de la philosophie "fonctions pures
 * uniquement" du reste de la suite (voir ROADMAP_STATUS.md §2.1) : compare
 * BACKUP_TABLES au schéma réel via une connexion Supabase authentique,
 * plutôt que la copie dummy injectée par vitest.config.ts pour tout le
 * reste de la suite. Lit .env.local directement (indépendamment de
 * process.env déjà fixé par vitest.config.ts) — s'auto-désactive
 * proprement si ce fichier est absent (ex. CI sans secrets), plutôt que
 * d'échouer bruyamment.
 */
function loadRealCredentials(): { url: string; key: string } | null {
  const envPath = path.resolve(__dirname, "../../../.env.local");
  if (!fs.existsSync(envPath)) return null;

  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.SUPABASE_SERVICE_ROLE_KEY) return null;
  return { url: vars.NEXT_PUBLIC_SUPABASE_URL, key: vars.SUPABASE_SERVICE_ROLE_KEY };
}

const credentials = loadRealCredentials();

describe.runIf(credentials)("couverture BACKUP_TABLES vs schéma réel (test d'intégration, base réelle)", () => {
  it("chaque table applicative du schéma public est soit sauvegardée, soit explicitement exclue avec une raison", async () => {
    const supabase = createClient(credentials!.url, credentials!.key);
    const { data: realTables, error } = await supabase.rpc("list_public_base_tables");
    expect(error).toBeNull();
    expect(Array.isArray(realTables)).toBe(true);

    const accountedFor = new Set([...BACKUP_TABLES, ...Object.keys(BACKUP_EXCLUDED_TABLES)]);
    const unaccountedFor = (realTables as string[]).filter((t) => !accountedFor.has(t));

    expect(
      unaccountedFor,
      `Table(s) présentes en base mais absentes à la fois de BACKUP_TABLES et de BACKUP_EXCLUDED_TABLES : ${unaccountedFor.join(", ")}. ` +
        `Ajouter cette table à l'un des deux (backups.ts) ET à export_backup_snapshot() (migration SQL) si elle doit être sauvegardée.`
    ).toEqual([]);
  });

  it("BACKUP_EXCLUDED_TABLES ne contient que des tables qui existent réellement", async () => {
    const supabase = createClient(credentials!.url, credentials!.key);
    const { data: realTables } = await supabase.rpc("list_public_base_tables");
    const realSet = new Set(realTables as string[]);

    const ghostExclusions = Object.keys(BACKUP_EXCLUDED_TABLES).filter((t) => !realSet.has(t));
    expect(ghostExclusions).toEqual([]);
  });
});

describe.skipIf(credentials)("couverture BACKUP_TABLES vs schéma réel", () => {
  it("désactivé — nécessite .env.local avec des identifiants Supabase réels (voir loadRealCredentials)", () => {
    expect(true).toBe(true);
  });
});
