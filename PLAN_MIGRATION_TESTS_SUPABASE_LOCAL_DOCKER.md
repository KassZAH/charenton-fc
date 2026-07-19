# Plan de migration — tests Charenton FC vers Supabase local (Docker)

_Document de planification uniquement. Aucune implémentation à ce stade. Le projet Supabase isolé
(`cimbymuifzooxrnenznd`, `charenton-fc-lot7-test`) n'est ni mis en pause ni supprimé tant que ce
plan n'a pas été validé et exécuté._

## 1. Objectif

Réduire la dépendance des tests techniques (unitaires exclus, intégration et E2E) à un projet
Supabase cloud partagé entre toutes les sessions de travail, au profit d'une instance Supabase
locale (Docker, `supabase start`) démarrée et détruite à la demande — plus rapide, gratuite,
sans risque de collision entre deux sessions parallèles sur le même dataset.

## 2. État actuel (rappel, rien à changer immédiatement)

- Projet isolé cloud `cimbymuifzooxrnenznd` : utilisé par `npm run test:integration`,
  `npm run test:e2e`, `npm run seed:isolated`, `npm run seed:isolated:demo`.
- Garde-fou `scripts/isolated-env/guard.js` : refuse toute exécution si
  `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_PROJECT_REF` ne correspondent pas exactement à ce projet.
- CI GitHub Actions (`ci.yml`) : jobs `integration`/`e2e` conditionnels aux secrets
  `INTEGRATION_*`, qui pointent aujourd'hui vers ce même projet cloud isolé.
- 53 migrations (`supabase/migrations/`), déjà 100 % compatibles avec `supabase start` local (même
  format, aucune dépendance à une fonctionnalité cloud-only connue à ce jour).

## 3. Pourquoi migrer (bénéfices attendus)

- Suppression du risque de collision entre deux sessions agent lancées en parallèle sur le même
  projet cloud isolé (aujourd'hui : un seul dataset partagé, `fileParallelism: false` en
  intégration et concurrency de groupe en CI pour l'éviter — contournements, pas une élimination).
- Démarrage/arrêt instantané, aucun appel réseau vers Supabase Cloud pour les tests.
- Aucune dépendance à la disponibilité ou aux quotas du projet cloud isolé pour les tests.
- Reset complet trivial (`supabase db reset`) plutôt qu'un `wipe()` applicatif table par table.

## 4. Ce qui ne change pas

- Le seed applicatif (`reset-and-seed.js`, `seed-demo.js`) reste la source de vérité du contenu
  fictif — aucune réécriture de la logique de seed, seulement de la cible réseau.
- Les migrations restent le format `supabase/migrations/*.sql` existant, appliquées identiquement.
- Les tests unitaires (`npm test`) restent inchangés — ils n'ont jamais touché de vraie base.
- Le projet partagé réel reste totalement hors de portée de tout script de test, comme aujourd'hui.

## 5. Étapes envisagées (à valider avant toute exécution)

1. **Prérequis** : Docker Desktop (ou équivalent) disponible sur chaque poste/CI exécutant les
   tests d'intégration ou E2E. Vérifier la compatibilité avec l'environnement CI GitHub Actions
   actuel (runners `ubuntu-latest` supportent Docker nativement).
2. **Initialisation locale** : `supabase init` (si absent) + confirmation que `supabase/config.toml`
   pointe vers les mêmes migrations déjà versionnées, sans dupliquer de configuration.
3. **Nouveau garde-fou local** : remplacer (ou compléter) `guard.js` par une vérification
   équivalente pour le contexte local — ex. `SUPABASE_URL` valant explicitement
   `http://127.0.0.1:54321` (ou le port configuré), jamais une simple absence de vérification.
   Le principe reste identique : refuser de s'exécuter si la cible n'est pas reconnue sans
   ambiguïté comme locale.
4. **Double bascule progressive** : ajouter une variable d'environnement explicite
   (ex. `TEST_DB_TARGET=local` vs `TEST_DB_TARGET=isolated-cloud`) permettant de choisir la cible
   sans dupliquer les scripts de test — le projet isolé cloud reste utilisable en secours pendant
   toute la phase de transition.
5. **Scripts** : nouvelle commande `npm run supabase:local:start` / `npm run supabase:local:stop`
   (wrapping `supabase start`/`supabase stop`), et adaptation de `reset-and-seed.js`/`seed-demo.js`
   pour accepter la cible locale sans changer leur logique de contenu.
6. **CI** : nouveau job (ou adaptation du job existant) démarrant `supabase start` avant les tests
   d'intégration/E2E, sans nécessiter les secrets `INTEGRATION_*` — à comparer en parallèle avec le
   job cloud existant pendant une période de transition, avant de le remplacer.
7. **Playwright** : `playwright.config.ts` déjà conçu pour démarrer son propre serveur `next dev`
   local — seule la variable d'environnement Supabase ciblée doit changer, aucune réécriture des
   specs E2E elles-mêmes.
8. **Période de double fonctionnement** : les deux cibles (local Docker et cloud isolé) cohabitent
   le temps de valider la fiabilité et la vitesse du local sur plusieurs runs réels, avant toute
   décision de mise en pause du projet cloud isolé.
9. **Décision finale** (hors de ce plan, nécessite une validation utilisateur explicite et séparée) :
   mise en pause ou suppression du projet cloud isolé, seulement après une période de double
   fonctionnement jugée concluante.

## 6. Risques et points d'attention

- Les workflows GitHub Actions doivent démarrer/arrêter Supabase local de façon fiable à chaque
  run (temps de démarrage à mesurer, ne doit pas dégrader significativement la durée de la CI).
- Toute fonctionnalité qui dépendrait d'une spécificité du cloud Supabase (ex. Edge Functions,
  extensions non disponibles localement) devrait être identifiée avant la bascule — audit rapide
  des migrations existantes à faire en phase 2, aucune détectée à ce jour dans une lecture
  préliminaire.
- Les identifiants générés localement (clés anon/service_role de développement) sont publics et
  documentés par l'outil `supabase` lui-même — le garde-fou doit continuer à interdire toute
  confusion possible avec un projet réel, même si le risque de fuite change de nature (une clé
  locale n'a de sens que sur la machine qui l'a démarrée).
- Un contributeur sans Docker installé ne pourrait plus lancer les tests d'intégration/E2E en
  local sans installation préalable — à documenter clairement dans le README.

## 7. Non-objectif de ce plan

- Ne décide pas, ne programme pas, et n'exécute pas la mise en pause ou la suppression du projet
  Supabase isolé cloud (`cimbymuifzooxrnenznd`). Cette décision reste distincte et ultérieure.
- Ne modifie aucun test ni script existant — ce document sert uniquement de base de discussion
  avant toute implémentation, à valider explicitement avant de commencer la Phase 1.
