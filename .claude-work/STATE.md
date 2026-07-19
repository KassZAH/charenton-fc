# STATE — Mode Démo (post-Macro B) + Macro B validation finale

Macro-release B : TERMINÉE, validée par l'utilisateur en production (commit `10718f8`).
Mode Démo : DÉPLOYÉ EN PRODUCTION (commit `7372dc9`), fonctionnalité isolée hors Macro-release.
Macro-release C non commencée (Lot 24.5 documenté sans code, prévu en tête de Macro C).

## Dernières actions
- Backup protégé pré-migration vérifié (`before_demo_mode_team_showcase_production`, checksum
  recalculé indépendamment, identique).
- 2 migrations appliquées au projet partagé (55/55 alignées) : `seasons.is_demo` +
  contrainte `seasons_demo_never_active`, `player_restrictions.season_id`,
  `venues/match_templates/checklist_templates.is_demo`, RPC `purge_demo_dataset`.
- Isolation des statistiques/rotation/fiabilité/records/badges/mémoire du club auditée puis
  corrigée dans ~15 fichiers (`src/lib/data/demo-scope.ts` = point d'entrée unique).
- Dataset Démo créé en production via `npx tsx scripts/demo/run-create-demo-dataset.ts`
  (24 vrais joueurs actifs référencés, 20 matchs fictifs).
- `verify:deployment` 13/13 avant ET après création du dataset — compteurs réels inchangés.
- Rapport détaillé de déploiement : voir le message de fin de session.

## Blocages
Aucun.

## Prochaine action
Attendre une éventuelle validation/retour utilisateur sur le Mode Démo. Ne pas commencer la
Macro-release C sans autorisation explicite. Mise en pause du projet isolé : action manuelle
Dashboard laissée à l'utilisateur (voir PAUSE_PROJET_SUPABASE_ISOLE.md).
