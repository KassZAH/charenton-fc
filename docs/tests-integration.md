# Tests d'intégration — projet Supabase isolé (roadmap V3, Lot 9)

Socle de tests reproductibles pour les fonctions transactionnelles
sensibles (RPC des Lots 6, 7, 8), sans jamais toucher le projet Supabase
partagé (production réelle du club).

## Installation

```
npm ci
```

Aucune dépendance supplémentaire : les tests d'intégration réutilisent
`vitest` et `@supabase/supabase-js`, déjà présents.

## Variables requises

Copier `.env.integration.local.example` vers `.env.integration.local`
(déjà exclu de git) et renseigner les 4 identifiants du projet **isolé**
`charenton-fc-lot7-test` (jamais ceux du projet partagé, listés dans
`.env.local`) :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF` — doit être exactement `cimbymuifzooxrnenznd`.
- `SESSION_SECRET` — non utilisé par les tests eux-mêmes, présent pour
  cohérence avec le reste de l'environnement isolé.

## Règle interdisant le projet partagé

Tout script sous `scripts/isolated-env/` et tout test
`*.integration.test.ts` passe par `scripts/isolated-env/guard.js` avant la
moindre requête réseau : `assertIsolatedProjectEnv()` compare la référence
extraite de `NEXT_PUBLIC_SUPABASE_URL` et la valeur de
`SUPABASE_PROJECT_REF` à la référence unique autorisée
(`cimbymuifzooxrnenznd`), codée en dur dans `guard.js`. Toute divergence —
variable absente, mauvaise référence, ou les deux qui ne concordent pas
entre elles — fait échouer immédiatement l'exécution, avant tout appel
Supabase. Ce n'est jamais un simple nom d'environnement (`NODE_ENV=test`)
qui est vérifié, mais la référence exacte du projet.

## Lancer les tests unitaires

```
npm test
```

Inchangé par le Lot 9 — fonctions pures uniquement, identifiants factices
injectés par `vitest.config.ts`, aucune connexion réseau réelle.

## Lancer les tests d'intégration

```
npm run test:integration
```

Utilise `vitest.integration.config.ts` (fichiers `*.integration.test.ts`
uniquement, jamais mélangés à la suite unitaire) et
`vitest.integration.setup.ts` (charge `.env.integration.local`, applique le
garde-fou). `fileParallelism: false` : les fichiers de test s'exécutent
l'un après l'autre, jamais en parallèle, pour ne pas se marcher dessus sur
le même dataset partagé.

Couverture actuelle :

- `src/lib/data/rpc-security.integration.test.ts` — toutes les RPC
  sensibles des Lots 6/7/8 refusées à `anon`, acceptées côté
  `service_role` ; accès aux snapshots réservé (jamais `anon`).
- `src/lib/data/rpc-transactions.integration.test.ts` — `close_season_and_start_new`
  (Lot 7) et `upsert_injury_and_sync_availability`/`restore_audit_entry_transactional`
  (Lot 8) : permissions Joueur/Coach/Propriétaire, échec intermédiaire avec
  rollback complet, double soumission, appels concurrents, `session_version`,
  verrouillage de saison, audit minimal sans donnée sensible.

## Remise à zéro et seed du dataset isolé

```
npm run seed:isolated
```

Exécute `scripts/isolated-env/reset-and-seed.js` : vide entièrement les
tables de données (jamais `team_settings`, singleton conservé) dans un
ordre respectant les clés étrangères, puis recrée le même dataset fictif
déterministe (5 joueurs, 1 saison, 3 matchs, cotisations) avec de nouveaux
identifiants à chaque exécution. Idempotent — peut être relancé autant de
fois que nécessaire, converge toujours vers la même structure.

`resetAndSeed()` est aussi exporté et réutilisé directement par
`rpc-transactions.integration.test.ts` (`beforeAll`), pour éviter deux
implémentations de la même logique.

## Procédure de nettoyage

Aucun script de nettoyage séparé : relancer `npm run seed:isolated` après
une session de tests manuels ramène le dataset à son état initial propre
(c'est la même opération qu'une remise à zéro avant tests — voir
`roadmap-v3-discussion/lot-07-assistant-changement-saison/06-remise-a-zero-avant-D7-C.md`
pour la logique équivalente employée manuellement avant le Lot 9).

## CI

`.github/workflows/ci.yml` : le job `unit` (typecheck, lint, tests,
build) tourne toujours. Le job `integration` ne s'exécute que si les
secrets `INTEGRATION_SUPABASE_URL`/`INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`
sont configurés dans le dépôt GitHub (Settings → Secrets) — sinon un
message explicite (`::warning::`) l'indique et le job se termine sans
échouer. Jamais les secrets de production (`SUPABASE_SERVICE_ROLE_KEY`
générique) ne sont utilisés ici — uniquement des secrets `INTEGRATION_*`
dédiés au projet isolé. Un groupe de concurrence
(`ci-integration-${{ github.ref }}`) empêche deux runs d'utiliser le
dataset isolé en même temps.

## Tests E2E — délibérément différés

Aucun outillage de test visuel/navigateur (Playwright, Cypress) n'existe
dans ce projet. En introduire un pour les six scénarios minimaux prévus par
la Roadmap V3 (login Joueur/Coach/Propriétaire, contrôle d'accès admin,
lecture seule Coach, action Propriétaire) constituerait une réelle
"refonte" d'outillage — installation de navigateurs, configuration CI
dédiée, temps d'exécution — au-delà de ce que le Lot 9 autorise
explicitement (« si l'outillage existant le permet sans refonte
excessive »). Décision de périmètre assumée, pas un oubli : les scénarios
de permissions/rôles sont déjà couverts par les tests d'intégration serveur
ci-dessus (qui vérifient exactement les mêmes garanties au niveau RPC) et
par la validation manuelle déjà pratiquée sur les previews isolées tout au
long des Lots 7/8.
