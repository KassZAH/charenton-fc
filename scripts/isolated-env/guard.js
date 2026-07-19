/**
 * Roadmap V3, Lot 9 — garde-fou partagé par tous les scripts et tests
 * d'intégration touchant l'environnement isolé.
 *
 * Refuse explicitement de s'exécuter si la référence du projet Supabase
 * ciblé n'est pas exactement celle du projet isolé autorisé pour les tests
 * (charenton-fc-lot7-test). Ne se contente jamais d'un nom d'environnement
 * ambigu (ex. NODE_ENV=test, un simple préfixe d'URL) — compare la
 * référence exacte extraite de NEXT_PUBLIC_SUPABASE_URL à la fois à une
 * valeur attendue codée en dur ici et à SUPABASE_PROJECT_REF, qui doivent
 * concorder.
 */

const ALLOWED_ISOLATED_PROJECT_REF = "cimbymuifzooxrnenznd";

function extractProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  const match = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
  return match ? match[1] : null;
}

/** Lève une exception si l'environnement courant n'est pas, sans ambiguïté, le projet isolé autorisé. */
function assertIsolatedProjectEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const declaredRef = process.env.SUPABASE_PROJECT_REF;
  const urlRef = extractProjectRef(supabaseUrl);

  if (!supabaseUrl || !declaredRef) {
    throw new Error(
      "Environnement isolé introuvable : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_PROJECT_REF doivent être définis " +
        "(voir .env.integration.local.example). Ce script/test refuse de s'exécuter sans confirmation explicite."
    );
  }
  if (urlRef !== ALLOWED_ISOLATED_PROJECT_REF || declaredRef !== ALLOWED_ISOLATED_PROJECT_REF) {
    throw new Error(
      `Référence de projet refusée : attendu exactement "${ALLOWED_ISOLATED_PROJECT_REF}" ` +
        `(projet isolé charenton-fc-lot7-test), obtenu URL="${urlRef}" / SUPABASE_PROJECT_REF="${declaredRef}". ` +
        "Ce script/test ne s'exécute jamais sur un autre projet, en particulier jamais sur le projet partagé."
    );
  }
}

module.exports = { assertIsolatedProjectEnv, ALLOWED_ISOLATED_PROJECT_REF, extractProjectRef };
