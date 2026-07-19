/**
 * Commande serveur protégée pour créer/réinitialiser le dataset Mode Démo (§7 de la demande) —
 * réservée à un opérateur disposant de SUPABASE_SERVICE_ROLE_KEY, jamais exposée aux utilisateurs
 * de l'application. Référence les vrais joueurs actifs du projet ciblé (isolé ou partagé selon
 * les variables d'environnement déjà chargées par l'appelant) — jamais de faux compte créé.
 *
 * Usage : npx tsx scripts/demo/run-create-demo-dataset.ts
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (déjà chargées par
 * l'appelant, comme les autres scripts de ce dépôt — ce fichier ne charge rien lui-même).
 */
import { createOrResetDemoDataset } from "../../src/lib/data/demo-dataset";

createOrResetDemoDataset(null, "Script serveur protégé (npx tsx run-create-demo-dataset.ts)")
  .then((summary) => {
    console.log("CREATE_DEMO_DATASET_OK");
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((e) => {
    console.error("CREATE_DEMO_DATASET_FAILED:", e.message);
    process.exit(1);
  });
