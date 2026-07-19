# Mise en pause du projet Supabase isolé (`charenton-fc-lot7-test`, `cimbymuifzooxrnenznd`)

_Préparation uniquement — cet agent ne met pas le projet en pause lui-même (action manuelle dans
le Dashboard Supabase). Rédigé après validation complète du Mode Démo en production._

## 1. Confirmation avant mise en pause

- **Migrations** : les 55 migrations existent toutes dans `supabase/migrations/`, versionnées sur
  `master` (commit `7372dc9` au moment de cette rédaction). Aucune migration n'existe uniquement
  sur le projet isolé sans être aussi dans Git — le projet isolé ne contient aucun état
  reconstructible qui ne soit pas déjà dans ce dépôt.
- **Seeds reproductibles** :
  - `npm run seed:isolated` (`scripts/isolated-env/reset-and-seed.js`) — dataset technique minimal
    (5 comptes, 3 matchs), utilisé par tous les tests d'intégration/E2E. Idempotent, vérifié à
    chaque exécution de la suite de tests depuis le Lot 9.
  - `npm run seed:isolated:demo` (`scripts/isolated-env/seed-demo.js`) — dataset riche (14 comptes,
    20 matchs), déterministe (graine fixe), idempotent (vérifié par un test d'intégration dédié
    qui l'exécute deux fois consécutives et compare les compteurs).
  - Aucun des deux scripts ne dépend d'un état préexistant du projet isolé : les deux partent
    toujours d'un `wipe()` complet avant de semer.
- **Documentation de reconstruction** : un nouveau projet Supabase isolé peut être recréé à
  l'identique en (1) créant un projet Supabase vide, (2) `npx supabase link --project-ref
  <nouveau-ref>`, (3) `npx supabase db push --linked` (applique les 55 migrations dans l'ordre),
  (4) mettre à jour `ALLOWED_ISOLATED_PROJECT_REF` dans `scripts/isolated-env/guard.js` avec la
  nouvelle référence, (5) renseigner `.env.integration.local` avec les nouvelles clés. Aucune
  étape manuelle non documentée.

## 2. Ce qui cessera de fonctionner pendant la pause

Un projet Supabase en pause refuse toute connexion (REST et Postgres direct). Concrètement :

- `npm run test:integration` — échouera immédiatement (guard.js refuse déjà si l'URL ne
  correspond pas exactement au projet isolé attendu ; une fois en pause, les requêtes
  échoueront avec une erreur réseau/timeout plutôt qu'un refus applicatif).
- `npm run test:e2e` — `e2e/global-setup.ts` appelle `resetAndSeed()` avant toute suite : échouera
  au tout premier appel, aucun test E2E ne pourra s'exécuter.
- `npm run seed:isolated` / `npm run seed:isolated:demo` — échoueront immédiatement (connexion refusée).
- Le job CI GitHub Actions `integration` et `e2e` (`.github/workflows/ci.yml`) — passeront de
  verts à échoués (pas silencieusement ignorés : les secrets `INTEGRATION_*` sont bien présents,
  la CI tentera de s'y connecter et échouera avec une erreur de connexion).
- Toute preview Vercel pointée manuellement vers ce projet (comme celles de cette session) —
  cesserait de fonctionner. Aucune preview de ce type n'est actuellement déployée de façon
  permanente ; les URLs de preview générées pendant cette session expirent de toute façon
  normalement selon la politique de rétention Vercel.
- Le job `unit` (tests unitaires) — **non affecté** : il utilise des identifiants factices
  (`test.supabase.co`), jamais une connexion réseau réelle.
- La production (`https://charenton-fc.vercel.app`, projet `jhoozecgenpxxzcnhcic`) — **non
  affectée** : projet Supabase totalement distinct, jamais dépendant du projet isolé.

## 3. Action manuelle exacte à effectuer

Cet agent ne peut pas mettre un projet Supabase en pause (action réservée au Dashboard). Pour
libérer un slot de projet Supabase (ex. pour DuoOS) :

1. Se connecter à [supabase.com/dashboard](https://supabase.com/dashboard).
2. Sélectionner l'organisation contenant `charenton-fc-lot7-test` (ref `cimbymuifzooxrnenznd`).
3. Dans les paramètres du projet → **Pause project** (ou équivalent selon l'interface actuelle).
4. Conserver la référence `cimbymuifzooxrnenznd` documentée (ce fichier, `guard.js`,
   `.env.integration.local.example`) au cas où une reprise ultérieure des tests d'intégration/E2E
   serait nécessaire avant la migration complète vers Supabase local (Docker) — voir
   `PLAN_MIGRATION_TESTS_SUPABASE_LOCAL_DOCKER.md`.

Aucune autre action n'est nécessaire côté code : le dépôt ne contient aucune référence codée en
dur à ce projet en dehors de `scripts/isolated-env/guard.js` (garde-fou, pas une dépendance de
production) et des fichiers `.env.integration.local*` (jamais suivis par Git).
