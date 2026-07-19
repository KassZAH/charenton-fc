# Macro-release B — Organisation d'équipe — déploiement en production

_Autorisation reçue : « Je valide définitivement la preview de la Macro B. Déploie la Macro B en production conformément au protocole existant, sans ajouter de nouvelle fonctionnalité à cette branche. »_

## §1. Pré-vérifications — tout conforme

`master` local = `origin/master` = `ded7ac2` (clôture Macro A) avant fusion. Branche `macro-b-team-organization` propre, poussée, non divergée de `master` (fast-forward pur possible, vérifié). 10 migrations Macro B confirmées absentes du projet partagé (53 attendues après application, 43 avant). Aucun secret ni fixture suivi par git. Données partagées avant déploiement : 24 joueurs actifs, 31 matchs (30 non supprimés + 1 antérieur), `Saison 2026-2027` active, `owner_player_id` inchangé, 8 backups, 9 cotisations, 8 adversaires, 433 votes, 6 récompenses.

**Observation signalée, non liée à cette macro-release** : deux comptes actifs nommés « Test Joueur » et « Test Admin » existaient déjà sur le projet partagé avant cette session — non couverts par le contrôle automatisé de fixtures (qui ne vérifie que la table `opponents`). Ni modifiés ni supprimés.

## §2. Backup pré-déploiement

- ID : `5d9d015f-bfa8-4be4-be18-a1cad0c64d20`
- Label : `before_macro_b_team_organization_production`
- `protected=true`, `format_version=2`, 29 tables incluses (28 précédentes + `match_squad_entries` du Lot 17, avant l'ajout des 7 nouvelles tables Macro B).
- Checksum finalisé et **revérifié indépendamment** (recalcul depuis le contenu relu en base, sha256-canonical-json-v1) : identique pour le backup (`9ab9afa1...`) et son artefact `audit_log` (25 lignes, `47a9d8fb...`).
- Aucune donnée métier modifiée en dehors de l'insertion du backup (`backups` 8 → 9).

## §3. Gate technique complet — vert

`npm ci`, `tsc --noEmit`, `lint`, `test` (163 passed), `test:integration` (131 passed, incluant les 13 tests dédiés au dataset de démonstration), `test:e2e` (50 passed, mobile + desktop, contre la preview réellement déployée), `build`, `verify:deployment` (14/14 sur la dernière preview de validation). Tous exécutés exclusivement contre le projet isolé `cimbymuifzooxrnenznd` ou avec des identifiants factices (suite unitaire), jamais contre le projet partagé.

## §4. CI GitHub

`gh` non authentifié dans cet environnement — comme pour la Macro A, ceci n'a pas bloqué le déploiement. Tests unitaires, d'intégration et Playwright tous exécutés et vérifiés verts localement et sur la preview, comme détaillé au §3.

## §5. Migrations — projet partagé

10 migrations appliquées dans l'ordre (`player_restrictions` + 2 correctifs/registres, `response_deadline`, `venues_and_match_templates` + registre, `carpool_assignments` + registre, `equipment_status_and_checklist` + registre), historique local/remote réaligné (53/53, 0 écart). Vérifications automatiques après application :

- RLS activée sur les 7 nouvelles tables (`player_restrictions`, `venues`, `match_templates`, `carpool_assignments`, `checklist_templates`, `player_checklist_preferences`, `match_checklist_items`) — confirmé, aucune avec `relrowsecurity=false`.
- `EXECUTE` sur `export_backup_snapshot()` (mise à jour) toujours refusé à `anon` — vérifié empiriquement en direct.
- Les 7 nouvelles tables toutes à 0 ligne juste après migration — aucune fixture insérée.
- Lecture `anon` des 7 nouvelles tables : aucune erreur, aucune ligne (RLS sans policy, comportement attendu).
- Aucune policy existante modifiée hors périmètre.

## §6. Fusion et déploiement

Fast-forward pur (`master` non divergé), commit `10718f8`. Un commit de documentation supplémentaire (`a3c5320` : statuts de lots, Lot 24.5 planifié, plan de migration Docker) poussé ensuite. Vercel confirmé `target: production`/`READY` sur les deux commits (déploiements créés quelques secondes après chaque push, aucun autre commit sur `master` entre-temps).

**Hash final de `master` : `a3c5320`.**

## §7-9. Vérifications post-déploiement et données finales

`verify:deployment` contre `https://charenton-fc.vercel.app` : **13/13 conforme** sur le commit final — migrations alignées, RLS, permissions anon, couverture des sauvegardes (39 tables), absence de fixture de démonstration, 6 pages principales toutes < 500.

Comparaison avant/après complète : `players`=24 (inchangé), `matches`=31 (inchangé), `goals`=59 (inchangé), `cards`=53 (inchangé), `match_players`=441 (inchangé), `dues`=9 (inchangé), `opponents`=8 (inchangé), `votes`=433 (inchangé), `awards`=6 (inchangé), `backups`=9 (8+1, le backup pré-déploiement), `owner_player_id` inchangé, aucun match `status='live'`. **Confirmation explicite : aucune mutation réelle (aucun match créé/démarré/modifié, aucune restriction/covoiturage/matériel/checklist réel, aucun but/carton) n'a été exécutée par cet agent à aucun moment de ce déploiement.**

## §10. Documentation

`ROADMAP_STATUS.md` : les 6 lots (19-24) marqués « déployé en production, en attente de validation utilisateur finale » — aucun marqué `TERMINÉ` dans la Roadmap V3 (`ROADMAP_EXECUTION_COMPLETE_CHARENTON_FC_V3.md`) avant cette validation finale. Lot 24.5 (fiabilité de présence) documenté sans code, planifié en tête de Macro-release C. Plan de migration Docker rédigé (`PLAN_MIGRATION_TESTS_SUPABASE_LOCAL_DOCKER.md`), aucune exécution.

**Arrêt ici. Pas de Macro C. Aucun vrai match créé, démarré ou modifié par cet agent. En attente de la validation finale en production de l'utilisateur.**
