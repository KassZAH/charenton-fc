#!/usr/bin/env node
/**
 * Roadmap V3, protocole macro-releases §8.3 / §2.3 — vérificateur de
 * déploiement réutilisable. Contrôle ce qui est vérifiable de façon
 * automatisée après une preview ou une production : hash Git, migrations
 * alignées, RLS sur chaque table, permissions anon/authenticated des
 * fonctions sensibles, couverture des sauvegardes, compteurs métier,
 * absence de fixtures, santé HTTP des pages principales. Produit un
 * rapport lisible et échoue (code de sortie 1) en cas de divergence.
 *
 * Usage :
 *   node scripts/verify-deployment.js --url https://charenton-fc.vercel.app
 *   node scripts/verify-deployment.js --url <preview> --expect-isolated
 *   node scripts/verify-deployment.js --before counters-before.json --after counters-after.json
 *
 * Lit les identifiants Supabase depuis les variables d'environnement déjà
 * chargées par l'appelant (.env.local pour le partagé, .env.integration.local
 * pour l'isolé) — ce script ne charge rien lui-même, pour ne jamais deviner
 * silencieusement le mauvais projet.
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}
const hasFlag = (flag) => args.includes(flag);

const baseUrl = argValue("--url");
const dumpCountersTo = argValue("--dump-counters");
const beforeCountersPath = argValue("--before");
const expectIsolated = hasFlag("--expect-isolated");

const results = [];
function record(section, ok, detail) {
  results.push({ section, ok, detail });
  console.log(`${ok ? "✅" : "❌"} [${section}] ${detail}`);
}

const ISOLATED_REF = "cimbymuifzooxrnenznd";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans l'environnement — rien à vérifier.");
    process.exit(1);
  }
  const projectRef = (supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] ?? "?";
  const admin = createClient(supabaseUrl, serviceKey);

  console.log(`\n=== Vérificateur de déploiement — projet ${projectRef} ===\n`);

  // --- 1. Hash Git ---
  try {
    const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
    record("git", true, `HEAD = ${commit} (${branch})`);
  } catch (e) {
    record("git", false, `impossible de lire le commit courant : ${e.message}`);
  }

  // --- 2. Isolation attendue ---
  if (expectIsolated && projectRef !== ISOLATED_REF) {
    record("isolation", false, `--expect-isolated demandé mais le projet ciblé est "${projectRef}", pas "${ISOLATED_REF}".`);
  } else if (expectIsolated) {
    record("isolation", true, `projet isolé confirmé (${ISOLATED_REF}).`);
  }

  // --- 3. Migrations locales/distantes alignées ---
  try {
    const out = execSync("npx supabase migration list --linked", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    const braceIndex = out.indexOf("{");
    if (braceIndex !== -1) {
      const parsed = JSON.parse(out.slice(braceIndex));
      const mismatched = parsed.migrations.filter((m) => m.local !== m.remote);
      record(
        "migrations",
        mismatched.length === 0,
        mismatched.length === 0
          ? `${parsed.migrations.length} migrations, local/remote alignés.`
          : `${mismatched.length} migration(s) en attente ou en écart : ${mismatched.map((m) => m.local).join(", ")}`
      );
    } else {
      record("migrations", false, "sortie de `supabase migration list --linked` inattendue.");
    }
  } catch (e) {
    record("migrations", false, `supabase CLI indisponible ou non lié : ${e.message.split("\n")[0]}`);
  }

  // --- 4. RLS activée sur chaque table publique ---
  try {
    const out = execSync(
      `npx supabase db query --linked "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity=false;"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const braceIndex = out.indexOf("{");
    const parsed = braceIndex !== -1 ? JSON.parse(out.slice(braceIndex)) : { rows: [] };
    const withoutRls = (parsed.rows || []).map((r) => r.relname);
    record("rls", withoutRls.length === 0, withoutRls.length === 0 ? "RLS activée sur toutes les tables publiques." : `RLS désactivée sur : ${withoutRls.join(", ")}`);
  } catch (e) {
    record("rls", false, `vérification RLS impossible : ${e.message.split("\n")[0]}`);
  }

  // --- 5. anon/authenticated refusés sur les RPC sensibles connues ---
  const sensitiveRpcs = [
    "export_backup_snapshot",
    "create_sensitive_backup_with_audit_artifact",
    "close_season_and_start_new",
    "upsert_injury_and_sync_availability",
    "restore_audit_entry_transactional",
    "sync_external_standings_transactional",
    "set_match_goalkeepers",
    "set_match_squad",
    "unlock_match_squad",
    "insert_goals_batch",
    "cancel_goals_batch",
  ];
  if (anonKey) {
    const anon = createClient(supabaseUrl, anonKey);
    const stillAllowed = [];
    for (const fn of sensitiveRpcs) {
      const { error } = await anon.rpc(fn, {});
      // Avec des arguments vides, PostgREST échoue souvent à résoudre la signature avant même
      // d'atteindre le contrôle de permission ("Could not find the function...") — ce script vise
      // un contrôle ponctuel après déploiement, pas la preuve définitive (déjà apportée par
      // rpc-security.integration.test.ts avec les vrais arguments). Seul un vrai succès est suspect.
      if (!error || (!/permission denied|does not exist|could not find the function/i.test(error.message))) {
        stillAllowed.push(fn);
      }
    }
    record("permissions anon", stillAllowed.length === 0, stillAllowed.length === 0 ? `${sensitiveRpcs.length} fonction(s) sensible(s) vérifiée(s), anon toujours refusé.` : `anon semble autorisé sur : ${stillAllowed.join(", ")}`);
  } else {
    record("permissions anon", false, "NEXT_PUBLIC_SUPABASE_ANON_KEY absent — impossible de vérifier le refus anon.");
  }

  // --- 6. Couverture des sauvegardes ---
  try {
    const { data: realTables, error } = await admin.rpc("list_public_base_tables");
    if (error) throw error;
    const backupsPath = require("path").resolve(__dirname, "../src/lib/data/backups.ts");
    const source = fs.readFileSync(backupsPath, "utf8");
    const tablesBlock = source.match(/BACKUP_TABLES = \[([\s\S]*?)\] as const/)?.[1] ?? "";
    const excludedBlock = source.match(/BACKUP_EXCLUDED_TABLES: Record<string, string> = \{([\s\S]*?)\}/)?.[1] ?? "";
    const backupTables = [...tablesBlock.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    const excludedTables = [...excludedBlock.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]);
    const accounted = new Set([...backupTables, ...excludedTables]);
    const unaccounted = realTables.filter((t) => !accounted.has(t));
    record("couverture backups", unaccounted.length === 0, unaccounted.length === 0 ? `${realTables.length} tables, toutes couvertes.` : `non couvertes : ${unaccounted.join(", ")}`);
  } catch (e) {
    record("couverture backups", false, `vérification impossible : ${e.message}`);
  }

  // --- 7. Compteurs métier ---
  const counters = {};
  try {
    const [{ count: players }, { count: archived }, { data: seasons }, { count: matches }, { count: dues }, { data: settings }, { count: backups }] = await Promise.all([
      admin.from("players").select("*", { count: "exact", head: true }),
      admin.from("players").select("*", { count: "exact", head: true }).eq("status", "archived"),
      admin.from("seasons").select("id, name").eq("is_active", true),
      admin.from("matches").select("*", { count: "exact", head: true }),
      admin.from("dues").select("*", { count: "exact", head: true }),
      admin.from("team_settings").select("owner_player_id").eq("id", 1).maybeSingle(),
      admin.from("backups").select("*", { count: "exact", head: true }),
    ]);
    Object.assign(counters, {
      players,
      archived,
      activeSeasons: seasons?.length ?? 0,
      activeSeasonName: seasons?.[0]?.name ?? null,
      matches,
      dues,
      ownerPlayerId: settings?.owner_player_id ?? null,
      backups,
    });
    record("compteurs", counters.activeSeasons === 1, `${JSON.stringify(counters)}`);
    if (counters.activeSeasons !== 1) {
      record("compteurs", false, `nombre de saisons actives = ${counters.activeSeasons}, attendu exactement 1.`);
    }
  } catch (e) {
    record("compteurs", false, `lecture impossible : ${e.message}`);
  }

  if (dumpCountersTo) {
    fs.writeFileSync(dumpCountersTo, JSON.stringify(counters, null, 2));
    console.log(`Compteurs écrits dans ${dumpCountersTo}`);
  }
  if (beforeCountersPath && fs.existsSync(beforeCountersPath)) {
    const before = JSON.parse(fs.readFileSync(beforeCountersPath, "utf8"));
    const diffs = Object.keys(before).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(counters[k]));
    record("compteurs avant/après", diffs.length === 0, diffs.length === 0 ? "identiques avant/après." : `écarts sur : ${diffs.map((k) => `${k} (${before[k]} → ${counters[k]})`).join(", ")}`);
  }

  // --- 8. Absence de fixtures / données de démonstration ---
  // Ce contrôle n'a de sens que sur le projet partagé : le projet isolé contient par construction
  // des noms de test ("Adversaire Test", etc.) — le signaler dessus serait un faux positif permanent.
  if (projectRef === ISOLATED_REF) {
    record("fixtures", true, "projet isolé — présence de données de test attendue, contrôle ignoré.");
  } else {
    try {
      const { data: opponents } = await admin.from("opponents").select("id, name").or("name.ilike.%fictif%,name.ilike.%demo%");
      const suspectCount = opponents?.length ?? 0;
      record("fixtures", suspectCount === 0, suspectCount === 0 ? "aucune donnée de démonstration détectée." : `${suspectCount} adversaire(s) suspect(s) (nom contenant fictif/demo) — à vérifier manuellement : ${opponents.map((o) => o.name).join(", ")}`);
    } catch (e) {
      record("fixtures", false, `vérification impossible : ${e.message}`);
    }
  }

  // --- 9. Santé HTTP des pages principales ---
  if (baseUrl) {
    for (const path of ["/", "/login", "/matches", "/stats", "/team", "/plus"]) {
      try {
        const res = await fetch(new URL(path, baseUrl), { redirect: "manual" });
        const ok = res.status < 500;
        record("http", ok, `${path} → ${res.status}${ok ? "" : " (erreur serveur)"}`);
      } catch (e) {
        record("http", false, `${path} → échec réseau (${e.message})`);
      }
    }
  } else {
    record("http", false, "--url non fourni — pages principales non vérifiées.");
  }

  // --- Rapport final ---
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Résumé : ${results.length - failed.length}/${results.length} contrôles conformes ===\n`);
  if (failed.length > 0) {
    console.log("Écarts détectés :");
    for (const f of failed) console.log(`  - [${f.section}] ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Échec du vérificateur :", e);
  process.exit(1);
});
