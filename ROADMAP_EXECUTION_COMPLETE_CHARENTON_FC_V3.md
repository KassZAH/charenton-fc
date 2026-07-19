
# Charenton FC — Roadmap complète d’exécution V3

_Document directeur unique pour l’agent IA chargé du code, des migrations Supabase, des tests, de l’UI, de la documentation et des déploiements._

_Dernière mise à jour : 18 juillet 2026._

_Cette V3 conserve toute la spécification technique détaillée de la V2, mais ajoute une séquence d’exécution unique par lots. Elle remplace les « cinq prochains lots » temporaires de ROADMAP_STATUS par un parcours complet de bout en bout._

---

# A. Protocole obligatoire

## A.1 Un seul lot à la fois

L’agent doit :

1. lire ce fichier, `ROADMAP_STATUS.md`, `ROADMAP_DEFERRED.md`, `AGENTS.md`, `CLAUDE.md`, les migrations, les fichiers et tests concernés ;
2. identifier le premier lot non terminé ;
3. présenter un plan ciblé ;
4. attendre la commande explicite `Commence le Lot X` ;
5. implémenter uniquement ce lot ;
6. exécuter `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` ;
7. appliquer les migrations d’abord sur une base de test ;
8. créer une preview Vercel ;
9. fournir des scénarios précis de test utilisateur ;
10. attendre la validation de la preview ;
11. corriger les anomalies dans le même lot ;
12. déployer en production après validation ;
13. vérifier la production avec des tests non destructifs ou des données temporaires nettoyées ;
14. mettre à jour `ROADMAP_STATUS.md` ;
15. produire un compte rendu ;
16. s’arrêter et demander l’autorisation du lot suivant.

L’agent doit terminer chaque lot par :

> **Lot X terminé. Je n’ai pas commencé le Lot X+1. J’attends ta validation explicite pour continuer.**

## A.2 Interdictions

- ne jamais regrouper plusieurs lots sans autorisation ;
- ne jamais profiter d’un lot pour refondre des fichiers sans rapport ;
- ne jamais modifier une migration historique déjà appliquée ;
- ne jamais tester une suppression, fusion ou restauration globale sur les vraies données ;
- ne jamais déployer une UI en production avant test utilisateur en preview ;
- ne jamais considérer « continue » comme l’autorisation de réaliser plusieurs lots ;
- ne jamais écrire ou publier des données via IA sans validation humaine.

## A.3 Gate Preview puis Production

### Preview

Le compte rendu intermédiaire doit contenir :

- URL preview ;
- fichiers et migrations ;
- commandes exécutées ;
- scénarios utilisateur à tester ;
- limites connues ;
- rollback prévu.

### Production

Après validation utilisateur :

- commit et hash ;
- URL production ;
- vérifications ;
- données temporaires créées puis nettoyées ;
- mise à jour de ROADMAP_STATUS ;
- arrêt obligatoire.

## A.4 Definition of Done

Un lot n’est terminé que si :

- le périmètre est respecté ;
- tests, lint, typecheck et build sont verts ;
- migration testée hors production ;
- permissions testées ;
- mobile et desktop vérifiés si UI ;
- états vides, erreur et chargement traités ;
- aide/documentation mise à jour ;
- nouvelles tables ajoutées aux backups ;
- rollback documenté ;
- validation utilisateur obtenue.

---

# B. Principes permanents

1. Ne pas perdre les données.
2. Ne pas accorder de faux droits.
3. Ne pas créer d’états incohérents.
4. Garder la saisie rapide.
5. Calculer automatiquement.
6. Accepter les données incomplètes.
7. Protéger blessures, restrictions, mesures, cotisations et données privées.
8. Ne pas créer de classement humiliant.
9. Ne jamais rendre obligatoires minutes, tirs, tacles, duels ou GPS.
10. Une IA propose un brouillon ou une anomalie ; elle ne modifie jamais seule les statistiques.

---

# C. Lots d’exécution

Les Lots 0 et 1 sont déjà terminés. Le prochain lot normal est le Lot 2.



## Lot 0 — Audit, sécurité initiale et baseline

**Statut initial : TERMINÉ**

### But
Conserver l’état issu des commits d’audit : sessions fraîches, rate limiting par joueur, sauvegardes améliorées, contraintes initiales, roster transactionnel, UI/UX et documentation.

### Périmètre
Ne rien refaire. Vérifier uniquement que les commits et migrations sont présents.

### Test utilisateur obligatoire
Aucun test utilisateur supplémentaire.

### Référence technique détaillée
V2 : Phases 0 à 4, éléments déjà marqués implémentés dans ROADMAP_STATUS.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 1 — Fermer le contournement du verrouillage de saison

**Statut initial : TERMINÉ**

### But
Empêcher la corbeille et l’historique de modifier une saison verrouillée.

### Périmètre
Conserver les commits ed7043c et bfe4758. Ne pas modifier à nouveau sauf bug.

### Test utilisateur obligatoire
Vérifier qu’une restauration sur saison verrouillée est refusée.

### Référence technique détaillée
V2 : §3.3 et §3.4.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 2 — Retirer la réinitialisation destructive

**Statut initial : À FAIRE**

### But
Faire de la clôture non destructive l’unique parcours normal.

### Périmètre
Retirer le bouton du profil, ajouter un lien vers Admin > Saisons, neutraliser resetSeasonData côté serveur avec un flag désactivé.

### Test utilisateur obligatoire
Admin : absence du bouton, lien saisons visible. Joueur : aucun accès. Appel direct : refus sans suppression ni backup.

### Référence technique détaillée
V2 : §0.1 et §2.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 3 — Contraintes SQL restantes

**Statut initial : À FAIRE**

### But
Garantir en base l’unicité et les valeurs métier.

### Périmètre
Vérifier les données puis ajouter saison active unique, réponse unique par match/joueur, vote unique, goal_type contraint.

### Test utilisateur obligatoire
Répondre, modifier une réponse, voter, modifier un vote, saisir chaque type de but valide.

### Référence technique détaillée
V2 : §3.1.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 4 — Sessions utilisateur et durée

**Statut initial : À FAIRE**

### But
Finaliser la révocation volontaire et réduire la durée excessive.

### Périmètre
Session 30 jours, bouton déconnecter tous mes appareils, révocation via session_version. Dates de changement seulement si utilisées.

### Test utilisateur obligatoire
Deux navigateurs connectés, révocation globale, reconnexion normale.

### Référence technique détaillée
V2 : §1.2 et §1.4.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 5 — Propriétaire explicite du club

**Statut initial : À FAIRE APRÈS VALIDATION PRODUIT**

### But
Créer un niveau propriétaire pour les futures opérations irréversibles.

### Périmètre
owner_player_id, requireOwner, transfert audité. Ne pas ajouter de permissions temporaires complexes.

### Test utilisateur obligatoire
Propriétaire autorisé, autre admin refusé. Ne pas transférer la vraie propriété sans compte test.

### Référence technique détaillée
V2 : §1.1.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 6 — Backups versionnés et rétention

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Rendre les exports vérifiables et honnêtes.

### Périmètre
Corriger le commentaire d’isolation, ajouter version, date, saison, auteur, compteurs, checksum, rétention prudente des backups hebdomadaires.

### Test utilisateur obligatoire
Créer/télécharger un backup, vérifier métadonnées et absence de promesse de restauration automatique.

### Référence technique détaillée
V2 : §2.1 à §2.4 Palier A.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- Backups format 2 versionnés (métadonnées, saison, auteur/contexte, version applicative et du schéma réellement appliqué).
- Compatibilité legacy (les 4 backups antérieurs au Lot 6 restent lisibles tels quels, aucune réécriture rétroactive).
- Checksums déterministes (`sha256-canonical-json-v1`, canonicalisation à clés triées).
- Vérification et réparation d'intégrité (5 états : legacy-unverifiable, needs-finalization, unverified, ok, mismatch).
- Snapshot SQL cohérent (`export_backup_snapshot()` en une seule instruction, cohérence démontrée par un protocole à deux sessions concurrentes).
- Artefacts `audit_log` séparés (`backup_artifacts`, création atomique avec le backup sensible associé).
- Permissions Coach / Propriétaire (métadonnées et création accessibles au coach, téléchargement complet/export/suppression réservés au propriétaire).
- Suppression manuelle sécurisée (confirmation par libellé exact, backups protégés jamais supprimables depuis l'interface).
- Aucune purge automatique (différée, voir `ROADMAP_DEFERRED.md`).
- Aucune restauration globale (différée, voir `ROADMAP_DEFERRED.md`).


## Lot 7 — Assistant complet de changement de saison

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Compléter le parcours non destructif existant.

### Périmètre
Matchs ouverts, incohérences, bilan, backup, verrouillage, nouvelle saison, joueurs actifs/archivés, traitement cotisations. Aucun match supprimé.

### Test utilisateur obligatoire
Tester uniquement sur une saison de démonstration ou base de test.

### Référence technique détaillée
V2 : §2.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- RPC transactionnelle unique `close_season_and_start_new()` (snapshot avant toute mutation, verrou `FOR UPDATE` sur la saison source, tout ou rien) — testée sur un projet Supabase isolé dédié (`charenton-fc-lot7-test`), jamais sur la base partagée.
- Backup `end_of_season` protégé format 2, checksum finalisé, créé automatiquement à chaque clôture.
- Archivage sécurisé des seuls joueurs sélectionnés (jamais le propriétaire, `pin_hash`/`pin_length` jamais touchés, `session_version` incrémenté).
- Cotisation optionnelle limitée aux joueurs actifs restants sur la nouvelle saison ; l'ancienne saison et ses cotisations restent intactes.
- `closeSeasonAction`/`toggleSeasonLock` réservés au propriétaire (`requireOwner()`) ; page `/admin/saisons` consultable en lecture par tout coach.
- Aperçus des matchs non joués et des matchs terminés mais incomplets de la saison active, scopés par saison (`getMatchesNeedingReviewForSeason`).
- Confirmation forte (nom exact de la saison retapé) revérifiée côté serveur, jamais une confiance client seule.
- `/season-recap?seasonId=...` pour consulter le bilan d'une saison passée, sans repli silencieux sur la saison active.
- Ancien mécanisme `startNewSeason` entièrement retiré, remplacé sans période de coexistence.
- Testé 30/30 (rejets, concurrence à deux clôtures simultanées, rollback complet, idempotence, intégrité historique) sur le projet isolé, puis validé manuellement par l'utilisateur via une clôture réelle sur une preview isolée.
- Migration appliquée au projet Supabase partagé après backup protégé préalable (`before_lot_7_season_assistant_migration`) ; code fusionné et déployé en production, vérifications de rôle (Propriétaire/Coach/Joueur) validées manuellement par l'utilisateur en conditions réelles.
- Aucun cycle de vote, aucune génération de chronique narrative, aucun report de dette entre saisons — explicitement hors périmètre de ce lot.
- Restauration globale toujours différée (voir `ROADMAP_DEFERRED.md`, inchangé) — le backup pré-migration sert de source pour une restauration assistée et manuelle à préparer, pas un mécanisme automatique.


## Lot 8 — Transactions critiques restantes

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Éviter les états partiels des opérations multi-tables.

### Périmètre
RPC pour blessure+disponibilités, restauration audit, clôture saison si nécessaire, pattern de fusion. Exclure restauration globale.

### Test utilisateur obligatoire
Tests d’échec intermédiaire et double envoi sur données temporaires.

### Référence technique détaillée
V2 : §3.2.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `upsert_injury_and_sync_availability()` et `restore_audit_entry_transactional()` : deux RPC transactionnelles remplaçant les séquences multi-étapes non transactionnelles.
- Correctif de sécurité réel découvert pendant l'audit : la restauration d'une fiche joueur exposait `pin_hash`/`session_version` à une réécriture silencieuse — corrigé par allow-list stricte de colonnes.
- Pattern de fusion documenté (pas de code spéculatif sans appelant réel).
- Testé 20/20 sur le projet isolé avant tout déploiement au projet partagé.


## Lot 9 — Socle de tests d’intégration

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Rendre reproductibles les tests sensibles sans utiliser la production.

### Périmètre
Projet Supabase de test ou local, fixtures, nettoyage, CI, tests permissions/verrouillage/transactions/backups.

### Test utilisateur obligatoire
Pas de parcours produit. Vérifier rapport CI et absence d’impact prod.

### Référence technique détaillée
V2 : §0.2 et §8.2-8.3.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `scripts/isolated-env/` : garde-fou de référence de projet, reset-and-seed idempotent.
- Suite `*.integration.test.ts` séparée (19/19), jamais mélangée à la suite unitaire.
- CI GitHub Actions — sa toute première exécution réelle (au déploiement du Lot 8) a révélé et permis de corriger deux bugs d'infrastructure préexistants (lockfile incomplet pour Linux, variables factices manquantes pour le build).
- Tests E2E navigateur délibérément différés (aucun outillage existant, décision documentée).


## Lot 10 — Composants UI transversaux

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Éviter les modales et états incohérents dans les futurs lots.

### Périmètre
ConfirmDialog, UndoToast, EmptyState, LoadingSkeleton, ErrorState, StatusBadge, ResponsivePageContainer, SectionAccordion.

### Test utilisateur obligatoire
Tester clavier, tactile, focus, réduction des animations et erreur réseau.

### Référence technique détaillée
V2 : §4.5 et §4.7.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- 7 composants créés (`ConfirmDialog`, `EmptyState`, `LoadingSkeleton`, `ErrorState`, `StatusBadge`, `ResponsivePageContainer`, `SectionAccordion`) ; `UndoToast` ajouté par extension du `ToastProvider` existant.
- `BottomSheet`/`AdminQuickActions` non créés faute d'usage réel identifié — décision de périmètre assumée.
- Intégrés dans un sous-ensemble représentatif (saisons, sauvegardes, fiche match, stats) — corrige au passage un vrai trou trouvé pendant l'audit (archivage d'un joueur sans aucune confirmation).


## Lot 11 — Responsive desktop et accessibilité

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Utiliser réellement l’espace desktop et fermer les écarts a11y.

### Périmètre
Accueil deux colonnes, match avec panneau actions, stats en grille, admin large, cibles 44 px, labels et erreurs.

### Test utilisateur obligatoire
Tester mobile, tablette, 1440 px, clavier et lecteur d’écran.

### Référence technique détaillée
V2 : §4.3, §4.4 et §4.6.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `ResponsivePageContainer` appliqué aux 7 pages prioritaires restantes (`max-w-5xl` contenu, `max-w-6xl` admin).
- `inputMode` ajouté sur les 14 champs numériques du dépôt (numeric/decimal selon le champ).
- Audit exhaustif des cibles tactiles/`aria-describedby`/ordre de tabulation non repris — décision de périmètre assumée, documentée.


## Lot 11.5 — Classement FLA dans les statistiques et informations des adversaires

**Statut initial : hors périmètre V3 d'origine, ajouté après obtention de l'autorisation FLA**

**Statut final : TERMINÉ**

### But
Intégrer le classement officiel FLA (Football Loisir Amateur) dans les statistiques du club et les informations d'adversaire sur les matchs, sous autorisation déclarée du propriétaire du projet.

### Périmètre
`LeagueStandingsProvider`/`FlaStandingsProvider` (parsing HTML serveur exclusivement, domaine verrouillé, aucune API tierce), trois tables (`external_competitions`, `external_standings`, `opponent_external_mappings`), RPC transactionnelle de synchronisation, association adversaire↔équipe externe conservatrice, onglet Classement FLA sur `/stats`, résumé de classement sur `/matches`/`/matches/[id]`/accueil.

### Référence technique détaillée
`docs/fla-integration.md`, `roadmap-v3-discussion/lot-11-5-fla-standings/`.

### Gate
Preview isolée validée par l'utilisateur, déployée en production le 19/07/2026, vérifiée non destructivement, validation finale utilisateur obtenue.

### Éléments livrés (Statut final)
- `FlaStandingsProvider` : parsing HTML robuste (cheerio), timeout, taille plafonnée, redirections refusées, cache préservé sur échec/vide.
- `sync_external_standings_transactional()` : remplacement du classement uniquement sur succès réel, `EXECUTE` réservé à `service_role`.
- Association adversaire↔équipe par normalisation conservatrice, jamais de correspondance faible auto-confirmée, gestion réservée au Propriétaire.
- Deux correctifs de sécurité/complétude trouvés et corrigés avant exposition prolongée lors de la vérification pré-production : RLS non activée sur les trois nouvelles tables (corrigé), tables absentes du registre de sauvegarde (corrigé).
- Classement réel actuellement vide (championnat 13, saison 2) — état affiché fidèlement, jamais de donnée fabriquée.


## Lot 12 — Alertes de préparation du match

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Afficher getMatchReadiness déjà écrit.

### Périmètre
Alertes effectif, gardien, covoiturage et matériel sur accueil/fiche, visibles aux rôles utiles, non bloquantes.

### Test utilisateur obligatoire
Créer un match incomplet, compléter chaque manque, vérifier disparition des alertes.

### Référence technique détaillée
V2 : §7.5 ; fonctionnalité existante signalée dans ROADMAP_STATUS.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `getMatchReadiness` distingue "pas encore de réponse" d'un manque réel (l'ancien comportement affichait un faux "manque" avant toute réponse).
- Alertes visibles à tous les rôles pour tout match à venir, plus seulement le jour J en tant qu'admin.
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 13 — Gardien par match

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Alimenter match_players.goalkeeper.

### Périmètre
Désignation dans roster, plusieurs gardiens possibles, affichage, readiness basé sur la vraie désignation avec repli temporaire.

### Test utilisateur obligatoire
Désigner un puis deux gardiens, vérifier fiche et alertes.

### Référence technique détaillée
V2 : §5.4 et §10.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `match_players.goalkeeper` (colonne présente depuis le début, jamais alimentée) devient la source réelle une fois la feuille de match confirmée, avec repli documenté sur le poste principal déclaré avant confirmation.
- Plusieurs gardiens possibles, RPC `set_match_goalkeepers` transactionnelle.
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 14 — Cycle de vie d’un match

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Introduire draft/scheduled/live/completed/cancelled/postponed et completion_status.

### Périmètre
Migration additive, backfill, transitions serveur, ancien résultat express intact.

### Test utilisateur obligatoire
Créer, annuler, reporter et terminer un match de test ; vérifier les listes.

### Référence technique détaillée
V2 : §5.1.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `matches_status_check` couvrait déjà draft/scheduled/completed/cancelled/postponed depuis la migration baseline — seul `live` manquait, désormais ajouté.
- Nouvelles colonnes `started_at`/`ended_at`/`completion_status`/`validated_at`/`validated_by_player_id`, matrice de transitions explicite et testée en pur.
- `updateMatchResult` (résultat express historique) reste l'unique chemin vers `completed` depuis `scheduled`, désormais validé contre la matrice.
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 15 — Démarrage, fin et écran Match en cours minimal

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Permettre la saisie au bord du terrain.

### Périmètre
startMatch, finishMatch, route live, score, but, carton, présent, note, chronologie, terminer. Résultat express maintenu.

### Test utilisateur obligatoire
Faux match mobile : démarrer, ajouter événements, corriger, terminer, vérifier fiche classique.

### Référence technique détaillée
V2 : §5.2, §5.3, §5.6 et §5.7.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- Nouvelle route `/matches/[id]/live` : score dérivé en direct des buts (jamais resaisi), chronomètre indicatif.
- Réutilise les sections existantes (feuille de match, gardien, buts, cartons) plutôt que de les dupliquer.
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 16 — Concurrence et idempotence du live

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Empêcher doublons et écrasements entre appareils.

### Périmètre
idempotency_key, double-clic, updated_at, verrouillage optimiste, conflit explicite, Realtime seulement si fiable.

### Test utilisateur obligatoire
Deux appareils sur le même faux match, ajouts simultanés et réseau brièvement coupé.

### Référence technique détaillée
V2 : §5.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `idempotency_key` sur buts/cartons (index unique partiel) — un double-clic envoie deux fois la même clé, la seconde insertion est silencieusement ignorée.
- Vérifié avec deux vrais contextes Playwright ajoutant des événements en parallèle.
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 17 — Verrouillage du groupe convoqué

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Distinguer groupe prévu et présence réelle.

### Périmètre
Convoqués, attente, gardien prévu, capitaine, composition publiée, audit et déverrouillage coach.

### Test utilisateur obligatoire
Verrouiller, vérifier vue joueur, modifier, puis confirmer une présence réelle différente.

### Référence technique détaillée
V2 : §5.8.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- Nouvelle table `match_squad_entries` (convoqués/liste d'attente/gardien prévu), publication+verrouillage transactionnels, déverrouillage réservé Coach/Propriétaire, présence réelle toujours indépendante.
- Deux bugs réels trouvés et corrigés en testant la RPC en direct avant l'UI (comparaison SQL à NULL, collision de nom `RETURNS TABLE`/colonne réelle).
- `match_squad_entries` ajoutée au registre de sauvegarde (correctif de complétude appliqué avant validation utilisateur).
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 18 — Saisie groupée des buts

**Statut initial : À FAIRE**

**Statut final : TERMINÉ**

### But
Saisir rapidement un match non suivi en live.

### Périmètre
Compteurs par joueur, CSC, inconnu, passes facultatives, transaction, double envoi protégé, annulation du lot.

### Test utilisateur obligatoire
Score 4-2 : 2 buts joueur A, 1 joueur B, 1 CSC, certaines passes, puis annulation.

### Référence technique détaillée
V2 : §5.9.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.

### Éléments livrés (Statut final)
- `insert_goals_batch`/`cancel_goals_batch` : transaction unique, score toujours dérivé des buts insérés, idempotente, annulation complète du lot restaurant l'état antérieur exact.
- Mêmes deux classes de bugs qu'au Lot 17, trouvées et corrigées de la même façon avant l'UI.
- Le formulaire perdait son option d'annulation immédiatement après un succès (trouvé par le scénario E2E) — corrigé avant validation utilisateur.
- Déployé en production le 19/07/2026, validé par l'utilisateur en conditions réelles.


## Lot 19 — Restrictions temporaires et historique de disponibilité

**Statut initial : À FAIRE**

**Statut : DÉPLOYÉ EN PRODUCTION** (Macro-release B, fusionné sur `master`, commit `10718f8`), en attente de validation utilisateur finale avant marquage TERMINÉ. Voir `ROADMAP_STATUS.md` pour le détail livré.

### But
Gérer reprise progressive sans dossier médical.

### Périmètre
player_restrictions, visibilité, alertes composition, chronologie blessures/retours/restrictions.

### Test utilisateur obligatoire
Créer restriction Test Joueur, vérifier vues joueur/admin/autre joueur, expiration et historique.

### Référence technique détaillée
V2 : §6.1 à §6.3.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 20 — Date limite et ponctualité des réponses

**Statut initial : À FAIRE**

**Statut : DÉPLOYÉ EN PRODUCTION** (Macro-release B, fusionné sur `master`, commit `10718f8`), en attente de validation utilisateur finale avant marquage TERMINÉ. Voir `ROADMAP_STATUS.md` pour le détail livré.

### But
Relancer les bons joueurs et mesurer sans sanction.

### Périmètre
response_deadline, first_responded_at, last_changed_at, late_response, exclusion blessés/archivés.

### Test utilisateur obligatoire
Répondre avant/après deadline avec comptes test, modifier réponse et vérifier badges.

### Référence technique détaillée
V2 : §6.4 et §6.7.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 21 — Rotation équitable et fiabilité positive

**Statut initial : À FAIRE**

**Statut : DÉPLOYÉ EN PRODUCTION** (Macro-release B, fusionné sur `master`, commit `10718f8`), en attente de validation utilisateur finale avant marquage TERMINÉ. Voir `ROADMAP_STATUS.md` pour le détail livré.

### But
Aider le coach sans score public ni sélection opaque.

### Périmètre
Suggestion expliquée, exclusion indisponibles, signaux positifs privés, tendances collectives.

### Test utilisateur obligatoire
Préparer historiques test, vérifier suggestions, ignorer une suggestion et confirmer absence d’automatisation.

### Référence technique détaillée
V2 : §6.5 à §6.7.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 22 — Terrains et modèles génériques de matchs

**Statut initial : À FAIRE**

**Statut : DÉPLOYÉ EN PRODUCTION** (Macro-release B, fusionné sur `master`, commit `10718f8`), en attente de validation utilisateur finale avant marquage TERMINÉ. Voir `ROADMAP_STATUS.md` pour le détail livré.

### But
Réutiliser lieux et créneaux sans recopier les données individuelles.

### Périmètre
venues + venue_id en transition, match_templates, ancien duplicateMatch conservé.

### Test utilisateur obligatoire
Créer terrain et modèle, générer deux matchs, vérifier qu’aucune présence/covoiturage n’est copié.

### Référence technique détaillée
V2 : §7.1 et §7.6.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 23 — Covoiturage avec affectations

**Statut initial : À FAIRE**

**Statut : DÉPLOYÉ EN PRODUCTION** (Macro-release B, fusionné sur `master`, commit `10718f8`), en attente de validation utilisateur finale avant marquage TERMINÉ. Voir `ROADMAP_STATUS.md` pour le détail livré.

### But
Savoir qui voyage avec qui.

### Périmètre
Affectation conducteur/passager, places restantes, point/heure, contact privé, déficit.

### Test utilisateur obligatoire
Un conducteur, deux passagers, modification capacité, annulation d’une présence.

### Référence technique détaillée
V2 : §7.2.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 24 — Matériel enrichi, rotation capitaine et checklist

**Statut initial : À FAIRE**

**Statut : DÉPLOYÉ EN PRODUCTION** (Macro-release B, fusionné sur `master`, commit `10718f8`), en attente de validation utilisateur finale avant marquage TERMINÉ. Voir `ROADMAP_STATUS.md` pour le détail livré.

### But
Centraliser les tâches du jour de match sans pression publique.

### Périmètre
Statuts matériel, reprise précédente, suggestions, capitaine, checklist privée et contextuelle.

### Test utilisateur obligatoire
Assigner/confirm/apporter/oubli, reprendre sur autre match, cocher checklist et vérifier réinitialisation.

### Référence technique détaillée
V2 : §7.3 à §7.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 24.5 — Fiabilité de présence

**Statut initial : À FAIRE**

**Décision de planification (2026-07-19)** : ce lot est ajouté après la production de la Macro-release B, à la demande de l'utilisateur, pour documentation uniquement — aucun code n'est écrit à ce stade. Il sera exécuté en tout début de la Macro-release C, regroupé avec les Lots 25 à 28 dans une seule preview consolidée (même protocole de macro-release que les groupes précédents).

### But
Mesurer la fiabilité réelle de présence (ponctualité d'arrivée, pas seulement de réponse) sans jamais déclencher d'exclusion automatique ni de jugement public — dans la continuité du Lot 20 (ponctualité des *réponses*) et du Lot 21 (rotation et fiabilité positive), dont ce lot complète le signal avec la présence physique réelle le jour du match.

### Périmètre
- Heure de rendez-vous configurable par match (distincte du coup d'envoi et de l'heure de RDV existante — ici la référence utilisée pour juger une arrivée à l'heure).
- Limite de titularisation configurable (heure au-delà de laquelle une arrivée compromet la place de titulaire, distincte d'un simple retard).
- Statuts d'arrivée : à l'heure ; en retard prévenu ; en retard non prévenu ; après la limite de titularisation ; absence excusée ; absence non signalée.
- Historique individuel de ces statuts, dans la continuité de l'historique de disponibilité (Lot 19) et de ponctualité de réponse (Lot 20) — jamais une table isolée de plus sans lien avec l'existant.
- Synthèse de fiabilité strictement privée (joueur concerné + coachs), sur le même principe que les signaux de fiabilité du Lot 21 (jamais un classement public, jamais un score affiché aux autres joueurs).
- Pondération : une absence non signalée pèse très fortement dans la synthèse, largement plus qu'un retard prévenu ou une absence excusée — la distinction entre "prévenu" et "non prévenu" est le signal le plus important de ce lot.
- Seuil configurable de révision après un nombre défini d'absences non signalées consécutives (par défaut 3) : déclenche une alerte de révision destinée au coach, jamais une action automatique sur le joueur.
- Aucune exclusion, suspension ou changement de statut automatique — le coach reste seul décisionnaire, comme pour toutes les suggestions des Lots 19-24.
- Audit des corrections : toute correction manuelle d'un statut d'arrivée par un coach doit être tracée (qui, quand, ancien/nouveau statut) — même exigence que les autres tables sensibles déjà couvertes par `audit_log`.
- Intégration à la rotation équitable (Lot 21) : la synthèse de fiabilité de présence doit alimenter `getRotationSuggestions`/`getPlayerReliabilitySignals` comme un signal supplémentaire, pas comme un système parallèle.

### Test utilisateur obligatoire
Créer plusieurs statuts d'arrivée pour un même joueur (à l'heure, retard prévenu, retard non prévenu, après limite titulaire, absence excusée, absence non signalée), vérifier la synthèse privée résultante, provoquer 3 absences non signalées consécutives et vérifier l'alerte de révision (sans aucune exclusion automatique), corriger un statut et vérifier sa trace d'audit.

### Référence technique détaillée
Nouveau — prolonge directement V2 §6.4 (deadline de réponse) et §6.6 (fiabilité organisationnelle positive), jamais documenté séparément avant cette décision de planification.

### Gate
Exécuté en même temps que les Lots 25 à 28 (Macro-release C) : un commit distinct pour ce lot, gate ciblé après son implémentation, gate complet unique en fin de macro-release, preview consolidée unique couvrant les cinq lots. Ne pas commencer avant le début effectif de la Macro-release C.


## Lot 25 — Demandes de correction et page À valider

**Statut initial : À FAIRE**

### But
Permettre aux joueurs de signaler et aux admins de traiter.

### Périmètre
correction_requests, présence/buteur d’abord, accept/refuse/edit, transaction, audit, extension de review.

### Test utilisateur obligatoire
Proposer présence et passe, accepter/refuser, vérifier données et disparition de la file.

### Référence technique détaillée
V2 : §8.1 et §8.3.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 26 — Confirmation collective et annulation rapide

**Statut initial : À FAIRE**

### But
Fiabiliser le compte rendu et récupérer immédiatement les petites erreurs.

### Périmètre
match_confirmations, correct/issue, validation admin, UndoToast serveur 10-15 s pour petites actions.

### Test utilisateur obligatoire
Confirmer avec présent/absent, signaler erreur, supprimer puis annuler un but, tester expiration.

### Référence technique détaillée
V2 : §8.2 et §8.4.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 27 — Joueurs invités et fusion sécurisée

**Statut initial : À FAIRE**

### But
Gérer les renforts ponctuels sans perdre leur historique.

### Périmètre
Utiliser is_guest, conversion, aperçu, backup, RPC transactionnelle, conservation de toutes les relations.

### Test utilisateur obligatoire
Invité Test avec présence/but, conversion, fusion uniquement en base de test.

### Référence technique détaillée
V2 : §8.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 28 — Deep links, liens publics et QR codes

**Statut initial : À FAIRE EN SOUS-LOTS INTERNES**

### But
Réduire les clics et unifier les liens partageables.

### Périmètre
next interne sécurisé, public_links générique, transition tokens existants, révocation, expiration, QR.

### Test utilisateur obligatoire
Lien présence déconnecté, URL externe refusée, lien public temporaire, révocation et scan QR.

### Référence technique détaillée
V2 : §9.1 à §9.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 29 — Statistiques intelligentes

**Statut initial : À FAIRE EN SOUS-LOTS INTERNES**

### But
Valoriser les données sans saisie supplémentaire.

### Périmètre
Duo passeur→buteur, records imminents, résumé mensuel, gardiens, filtres, stats organisationnelles privées.

### Test utilisateur obligatoire
Vérifier un duo connu, carte mensuelle, match gardien unique/multiple, filtres et confidentialité.

### Référence technique détaillée
V2 : §10.1 à §10.7.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 30 — Cycle formel des votes

**Statut initial : À FAIRE**

### But
Unifier match, MVP mensuel et trophées saison.

### Périmètre
vote_campaigns draft/open/closed/published/archived, résultats cachés, modification avant clôture, review.

### Test utilisateur obligatoire
Ouvrir, voter, clôturer, publier un vote de match puis un MVP test.

### Référence technique détaillée
V2 : §11.7.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 31 — Changelog, bugs et boîte à idées

**Statut initial : À FAIRE EN SOUS-LOTS INTERNES**

### But
Informer et recueillir les retours sans forum complet.

### Périmètre
Changelog versionné, bug_reports sans secrets, ideas/votes/commentaires courts et statuts.

### Test utilisateur obligatoire
Lire nouveauté, envoyer bug test, proposer idée, voter, modérer.

### Référence technique détaillée
V2 : §11.1, §11.4 et §11.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 32 — Défis collectifs, chronique et citations

**Statut initial : À FAIRE EN SOUS-LOTS INTERNES**

### But
Unifier bingo/défis/secrets et transformer la saison en récit.

### Périmètre
Moteur contrôlé commun, progression/déblocage, chronique versionnée, trophées, citation match_id.

### Test utilisateur obligatoire
Vérifier défis existants, débloquer secret test, générer/modifier chronique et lier citation.

### Référence technique détaillée
V2 : §11.2, §11.3, §11.8 et §11.9.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 33 — Page publique du club

**Statut initial : À FAIRE**

### But
Présenter le club sans fuite de données.

### Périmètre
Réglages opt-in, sections, indexation, prochain/dernier match, stats, histoire, profils autorisés.

### Test utilisateur obligatoire
Activer en preview, ouvrir navigation privée, inspecter données, désactiver sections et page.

### Référence technique détaillée
V2 : §12.1 et §12.2.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 34 — Storage, galerie et cartes

**Statut initial : À FAIRE EN SOUS-LOTS INTERNES**

### But
Permettre des médias sûrs et des souvenirs partageables.

### Périmètre
Buckets séparés, politiques, compression, URL signée, profil d’abord, galerie, cartes mensuelles/records/objectifs.

### Test utilisateur obligatoire
Upload type valide/invalide, privé/public, suppression, galerie et carte.

### Référence technique détaillée
V2 : §12.3 à §12.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 35 — Préférences et notifications push

**Statut initial : À FAIRE EN SOUS-LOTS INTERNES**

### But
Envoyer peu de notifications utiles et contrôlées.

### Périmètre
Préférences d’abord sans envoi, puis subscriptions, service worker, queue, appareils, anti-spam.

### Test utilisateur obligatoire
Deux appareils test, autorisation sur un, faux match, rappel, désactivation et heures silencieuses.

### Référence technique détaillée
V2 : §13.1 à §13.4.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 36 — Consultation et brouillons hors ligne minimaux

**Statut initial : À FAIRE**

### But
Rester utile sans mentir sur la synchronisation.

### Périmètre
Cache minimal, prochain match, brouillon score/correction, état hors ligne, synchronisation explicite.

### Test utilisateur obligatoire
Charger, passer hors ligne, créer brouillon, revenir, synchroniser sans doublon.

### Référence technique détaillée
V2 : §13.5.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 37 — Fonctions expérimentales

**Statut initial : À FAIRE EN SOUS-LOTS APRÈS NOUVELLE VALIDATION**

### But
Explorer voix, résumés, détection et recherche sans écriture automatique.

### Périmètre
Saisie vocale en brouillon, textes modifiables, anomalies déterministes, recherche via intentions et requêtes fiables.

### Test utilisateur obligatoire
Dictée test, correction avant validation, incohérence signalée, questions stats et refus de données privées.

### Référence technique détaillée
V2 : §14.1 à §14.4.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


## Lot 38 — Revue du backlog secondaire

**Statut initial : DOCUMENTATION UNIQUEMENT**

### But
Décider quoi faire des idées non prioritaires après stabilisation.

### Périmètre
Maillots, dépenses, tournoi, attente, renforts récurrents, réservations, objets perdus, quiz, capsule, Hall of Fame, but du mois, N/N-1, admin temporaire, statut technique.

### Test utilisateur obligatoire
Aucun test de code. Produire une recommandation à faire/simplifier/différer/abandonner.

### Référence technique détaillée
V2 : §6 Backlog secondaire.

### Gate
Après preview et corrections, déployer en production, mettre à jour `ROADMAP_STATUS.md`, produire le compte rendu, puis s’arrêter. Ne pas commencer le lot suivant sans validation explicite.


---

# D. Instruction de démarrage

À la réception de ce document, l’agent doit :

1. vérifier les commits et migrations présents ;
2. confirmer que les Lots 0 et 1 sont terminés ;
3. confirmer que le premier lot non terminé est le Lot 2, sauf changement réel du dépôt ;
4. ne modifier aucun code ;
5. attendre la commande :

> **Commence le Lot 2**

---

# E. Spécification technique détaillée intégrée

La section suivante reprend intégralement la Roadmap idéale V2.  
Elle constitue la référence technique détaillée pour les buts, migrations, règles métier, tests et critères d’acceptation cités par chaque lot ci-dessus.


# Charenton FC — Roadmap idéale d’implémentation

_Document directeur destiné à un agent IA chargé de modifier le code, les migrations Supabase, les tests, l’interface et la documentation._

_Dernière mise à jour : 18 juillet 2026 — version consolidée V2_

_Cette version intègre explicitement les éléments de `ROADMAP_DEFERRED.md`, en distinguant ce qui doit être réintroduit, ce qui reste volontairement simplifié et ce qui demeure différé pour raisons de sécurité ou de coût._

---

# 0. Mission du document

Cette roadmap n’est pas une simple liste d’idées. Elle doit servir de **contrat d’exécution** à l’agent qui fera évoluer l’application Charenton FC.

L’agent doit utiliser ce document pour :

1. comprendre l’objectif produit de chaque changement ;
2. connaître l’ordre obligatoire des travaux ;
3. identifier les migrations, règles métier, interfaces et tests nécessaires ;
4. éviter de reconstruire des fonctions déjà présentes ;
5. ne jamais sacrifier la sécurité ou l’historique pour livrer une nouveauté plus vite ;
6. livrer chaque lot de façon isolée, testable et réversible.

L’application est destinée à une équipe de football amateur. Son succès ne dépend pas du nombre de fonctions, mais de quatre qualités :

- une saisie extrêmement rapide ;
- une organisation concrète des matchs ;
- des données fiables sur plusieurs saisons ;
- une expérience amusante sans humiliation ni travail administratif inutile.

---

# 1. Instructions obligatoires pour l’agent IA

## 1.1 Lire avant de modifier

Avant chaque lot, l’agent doit lire au minimum :

- `AGENTS.md` ;
- `CLAUDE.md` ;
- `package.json` ;
- les migrations présentes dans `supabase/migrations/` ;
- les fichiers de données et Server Actions concernés ;
- les composants UI concernés ;
- les tests existants ;
- `BACKLOG.md` et `ROADMAP_DEFERRED.md`.

Le projet utilise **Next.js 16.2.10**, React 19, TypeScript, Supabase et des Server Actions. Conformément à `AGENTS.md`, l’agent ne doit pas appliquer aveuglément ses souvenirs d’anciennes versions de Next.js. Il doit consulter la documentation embarquée dans `node_modules/next/dist/docs/` lorsqu’une API, une convention ou un comportement est incertain.

## 1.2 Ne pas modifier plusieurs lots à la fois

Chaque lot doit être réalisé dans une branche ou un changement isolé.

Un lot doit suivre cet ordre :

1. état des lieux ciblé ;
2. plan technique court ;
3. migration SQL additive ;
4. logique serveur ;
5. interface ;
6. tests ;
7. documentation ;
8. validation locale ;
9. déploiement progressif ;
10. vérification en production avec données de test.

L’agent ne doit pas profiter d’un lot pour faire un grand refactoring sans rapport. Le folklore du « pendant qu’on y est » est l’une des méthodes les plus efficaces pour fabriquer trois bugs en corrigeant le premier.

## 1.3 Aucune opération destructive sans protection

Avant toute opération pouvant affecter plusieurs lignes ou l’historique :

- créer une sauvegarde complète ;
- vérifier que la sauvegarde contient toutes les tables attendues ;
- afficher un aperçu de l’impact ;
- exiger une confirmation explicite ;
- écrire une trace dans l’audit ;
- prévoir une restauration ou un retour arrière documenté.

Sont notamment concernés :

- clôture ou réinitialisation de saison ;
- restauration ;
- fusion de joueurs ;
- fusion d’adversaires ;
- suppression massive ;
- migration de données ;
- changement de propriétaire ;
- purge de la corbeille.

## 1.4 Principe « serveur d’abord »

Les règles métier et les permissions doivent être vérifiées côté serveur, même si l’interface empêche déjà une action.

Un bouton caché ne constitue pas une permission.

Chaque Server Action sensible doit :

- recharger l’utilisateur actuel depuis la base ;
- vérifier son statut actif ;
- vérifier son rôle actuel ;
- vérifier la saison et le match concernés ;
- vérifier que les identifiants fournis appartiennent bien au même objet ;
- valider toutes les valeurs reçues ;
- journaliser l’action si elle modifie l’historique.

## 1.5 Compatibilité et migrations

Les migrations doivent être :

- additives autant que possible ;
- idempotentes lorsque c’est raisonnable ;
- nommées `YYYYMMDDHHMMSS_description.sql` ;
- accompagnées de contraintes, index et commentaires utiles ;
- réversibles par une procédure documentée, même si aucune migration descendante automatique n’est ajoutée.

Lorsqu’un champ devient obligatoire :

1. l’ajouter nullable ;
2. remplir les données existantes ;
3. seulement ensuite ajouter `NOT NULL`.

## 1.6 Definition of Done globale

Un lot n’est terminé que si :

- `npm test` réussit ;
- `npm run lint` réussit ;
- `npm run build` réussit avec les variables d’environnement de test ;
- les migrations sont appliquées sur une base de test ;
- les permissions joueur, coach, admin et propriétaire sont testées ;
- mobile et desktop sont vérifiés ;
- les états vides, erreurs et chargements sont traités ;
- les textes d’aide sont mis à jour ;
- les nouvelles données figurent dans les sauvegardes si nécessaire ;
- aucune donnée historique n’a été silencieusement recalculée ou supprimée.

---

# 2. État actuel à respecter

## 2.1 Architecture existante

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL via client administrateur serveur
- Authentification personnalisée par sélection du joueur + PIN
- Sessions JWT dans un cookie HTTP-only
- Server Actions dans `src/lib/data/*-actions.ts`
- Pages dans `src/app/`
- Migrations dans `supabase/migrations/`
- Vitest pour les tests
- PWA installable via manifest et icônes

## 2.2 Fonctions déjà présentes à ne pas dupliquer

L’agent doit prolonger l’existant, pas créer un deuxième système parallèle.

Déjà présents :

- connexion joueur / coach / admin ;
- présence rapide ;
- blessures et retour estimé ;
- création, modification et suppression douce de matchs ;
- feuille de match ;
- score, buts, passes, cartons ;
- CSC adverse et CSC Charenton ;
- votes et récompenses ;
- composition tactique ;
- covoiturage ;
- matériel ;
- heure de rendez-vous ;
- lien Maps ;
- appel à renfort ;
- calendrier `.ics` et abonnement calendrier ;
- statistiques, records, tendances ;
- badges ;
- bilan de saison ;
- mémoire du club ;
- trophées et engagement ;
- cotisations ;
- sauvegardes téléchargées en JSON ;
- audit des modifications ;
- corbeille matchs/buts/cartons ;
- verrouillage de saison ;
- profils et visibilité ;
- profils joueurs publics ;
- PWA installable.

## 2.3 Risques connus à corriger avant les nouveautés

Les points suivants ont priorité absolue :

1. l’autorisation de réinitialisation repose sur le prénom `Amine` ;
2. la réinitialisation supprime tous les matchs, pas seulement la saison active ;
3. le rôle contenu dans le cookie peut rester valide 180 jours après une rétrogradation ;
4. aucun rate limiting robuste n’est visible sur les tentatives de PIN ;
5. la table `player_goals` manque dans la sauvegarde ;
6. la restauration n’est pas automatique ;
7. certaines opérations multi-tables ne sont pas transactionnelles ;
8. certains affichages historiques ignorent les joueurs archivés ;
9. le verrouillage de saison ne couvre pas encore toutes les écritures ;
10. les matchs passés restés `scheduled` peuvent polluer le prochain match.

Aucune fonction ludique ne doit être développée avant la fermeture des quatre premiers risques critiques.


## 2.4 Règle de traitement des éléments différés

`ROADMAP_DEFERRED.md` est un registre de dette fonctionnelle, pas une liste à implémenter intégralement sans discernement.

Chaque élément différé doit recevoir l’un des quatre statuts suivants :

- **Réintroduit** : manque encore pertinent, ajouté à une phase de cette roadmap.
- **Remplacé** : besoin déjà couvert par une solution plus légère et suffisante.
- **Toujours différé** : pertinent, mais dépend d’un chantier plus important ou présente un risque excessif.
- **Abandonné** : contraire au produit ou sans valeur suffisante.

### Éléments réintroduits dans cette roadmap

- registre de terrains réutilisables ;
- reprise du matériel du match précédent ;
- suggestion de rotation du capitanat ;
- date limite de réponse et réponses tardives ;
- verrouillage du groupe convoqué ;
- saisie groupée des buts après match ;
- propositions de correction par les joueurs ;
- page admin `À valider` complète ;
- modèles génériques de matchs ;
- QR codes ;
- système générique de liens publics temporaires ;
- interface pour identifier le ou les gardiens ;
- statistiques gardiens ;
- upload direct de photos via Supabase Storage ;
- citations liées à un match précis ;
- cycle formel des votes ;
- joueur du mois avec ouverture, clôture et publication ;
- trophées de fin de saison soumis au vote ;
- réactions emoji limitées à des contenus précis ;
- défis collectifs personnalisables après les modèles fixes ;
- audit global de tous les historiques utilisant des joueurs archivés.

### Solutions légères conservées

- pas de système complet de feature flags : un registre léger suffit ;
- pas d’environnement de démonstration permanent obligatoire : une base de test ou un projet Supabase séparé suffit pour les opérations sensibles ;
- les numéros retirés restent un champ du Hall of Fame ;
- la visibilité d’une photo sert de consentement tant qu’un vrai module média n’est pas déployé ;
- les statistiques sportives principales restent visibles dans l’équipe ;
- les rôles admin temporaires complexes restent hors priorité.

### Éléments toujours différés ou conditionnels

- restauration globale de production en un clic, tant qu’elle n’a pas été répétée avec succès sur une base isolée ;
- permissions administratives granulaires avec expiration ;
- upload vidéo lourd ;
- mode hors ligne complet ;
- réactions sociales généralisées ;
- créateur totalement libre de formules statistiques ou de défis.

L’agent doit mettre à jour ce statut à la fin de chaque phase concernée.

---

# 3. Principes produit permanents

## 3.1 Friction minimale

- Une présence doit être enregistrée en un clic.
- Un résultat express doit prendre moins d’une minute.
- Un résultat complet classique doit prendre moins de trois minutes.
- Les minutes, tirs, tacles, duels et remplacements détaillés ne sont jamais obligatoires.
- Une donnée inconnue doit pouvoir être marquée comme inconnue et complétée plus tard.

## 3.2 Calcul automatique

Ne jamais demander manuellement :

- victoire / nul / défaite ;
- différence de buts ;
- doublés et triplés ;
- séries ;
- taux de présence ;
- records ;
- duo le plus décisif ;
- résumé mensuel ;
- jalons.

## 3.3 Correction facile

- édition directe ;
- annulation rapide pour les petites actions ;
- historique et restauration pour les actions sensibles ;
- proposition de correction par les joueurs ;
- avertissement non bloquant plutôt qu’interdiction excessive.

## 3.4 Vie privée

Ne jamais rendre publics par défaut :

- blessures ;
- restrictions ;
- poids ;
- taille ;
- disponibilité ;
- cotisations ;
- commentaires privés ;
- historique administratif ;
- données de connexion.

Les blessures restent des informations d’organisation, pas un dossier médical. Aucun diagnostic, traitement, ordonnance ou document médical ne doit être stocké.

## 3.5 Positivité

Les statistiques organisationnelles doivent aider, pas humilier.

Autorisé :

- « Répond généralement rapidement » ;
- « Prévient en cas de changement » ;
- « Fiable sur les tâches attribuées ».

À éviter :

- note publique sur 100 ;
- classement du moins fiable ;
- badge permanent « fantôme » ;
- sanction automatique ;
- algorithme opaque de sélection.

---

# 4. Vue consolidée des phases

| Phase | Intitulé | Priorité | Dépendances |
|---|---|---:|---|
| 0 | Gel de sécurité et baseline | P0 | Aucune |
| 1 | Authentification, sessions et permissions | P0 | Phase 0 |
| 2 | Sauvegardes, restauration et saisons | P0 | Phase 1 |
| 3 | Intégrité des données et transactions | P0/P1 | Phases 1–2 |
| 4 | Socle UI/UX et navigation | P1 | Phase 1 |
| 5 | Cycle de vie du match et mode Match en cours | P1 | Phases 3–4 |
| 6 | Disponibilité avancée, restrictions et rotation | P1 | Phases 3–5 |
| 7 | Logistique enrichie et checklist personnelle | P1/P2 | Phase 6 |
| 8 | Corrections, validation collective et annulation | P1 | Phases 3–5 |
| 9 | Liens directs, accès public et découvrabilité | P2 | Phases 1 et 4 |
| 10 | Statistiques et résumés intelligents | P2 | Phases 5–8 |
| 11 | Engagement, mémoire et communication | P2 | Phase 10 |
| 12 | Médias, page publique et stockage | P2/P3 | Phases 1 et 9 |
| 13 | Notifications et PWA avancée | P3 | Phases 6–9 |
| 14 | Fonctions expérimentales | P4 | Toutes les phases stables |

---

# PHASE 0 — Gel de sécurité et baseline

## But

Empêcher qu’une nouvelle fonction soit construite sur une base dont les opérations critiques sont dangereuses ou mal testées.

## Travail à réaliser

### 0.1 Désactiver temporairement la réinitialisation actuelle

- Retirer le bouton de l’interface de production.
- Faire retourner à `resetSeasonData()` une erreur contrôlée tant que la nouvelle procédure n’est pas prête.
- Conserver le code uniquement le temps de la migration, puis le supprimer.

Fichiers probables :

- `src/app/profile/ResetButton.tsx`
- `src/app/profile/page.tsx`
- `src/lib/data/reset-actions.ts`

### 0.2 Créer une baseline de tests

Ajouter des tests ciblés pour figer les comportements existants :

- login réussi / échoué ;
- permission joueur / coach / admin ;
- ajout et suppression de but ;
- CSC des deux côtés ;
- réponse de présence ;
- joueur blessé non relancé ;
- verrouillage d’une saison ;
- sauvegarde contenant les tables essentielles.

### 0.3 Corriger l’outillage

- Synchroniser `package-lock.json` avec `package.json`.
- Vérifier `npm ci`.
- Supprimer l’usage inutile de `next/font/google` si l’application utilise Arial, ou embarquer une police locale.
- Optimiser `public/logo-charenton.png` sous 200 Ko.
- Remplacer le README généré par un README réel.

## Critères d’acceptation

- Aucun utilisateur ne peut réinitialiser des données depuis l’application.
- `npm ci`, test, lint et build réussissent.
- Le README décrit installation, migrations et variables d’environnement.
- Une sauvegarde manuelle peut être téléchargée avant les phases suivantes.

---

# PHASE 1 — Authentification, sessions et permissions

## But

Garantir que les droits reflètent toujours l’état actuel de la base et qu’un PIN ne puisse pas être testé indéfiniment.

## 1.1 Propriétaire explicite du club

Ne pas introduire une autorisation fondée sur un prénom ou un surnom.

### Modèle recommandé

Ajouter à `team_settings` :

```sql
owner_player_id uuid references public.players(id),
```

Le propriétaire reste éventuellement `admin` dans `players.role`, mais certaines opérations exigent en plus que son ID corresponde à `team_settings.owner_player_id`.

### Permissions

- Joueur : actions personnelles, votes, consultation.
- Coach : matchs, compositions, événements sportifs.
- Admin : joueurs, saisons, cotisations, contenu et réglages courants.
- Propriétaire : transfert de propriété, restauration globale, opérations irréversibles.

Créer des helpers :

- `requireFreshUser()` ;
- `requireFreshCoachOrAdmin()` ;
- `requireFreshAdmin()` ;
- `requireOwner()`.

Fichiers probables :

- `src/lib/auth/current-user.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/actions.ts`
- `src/types/models.ts`
- `src/types/database.ts`

## 1.2 Session courte et révocable

### Migration

Ajouter à `players` :

```sql
session_version integer not null default 1,
last_pin_change_at timestamptz,
last_role_change_at timestamptz
```

### JWT recommandé

Ne conserver que :

- `playerId` ;
- `sessionVersion`.

Ne pas faire confiance au rôle ou au nom présents dans le cookie.

### Validation

À chaque Server Action sensible :

1. vérifier la signature JWT ;
2. recharger le joueur ;
3. vérifier `status = active` ;
4. comparer `session_version` ;
5. récupérer le rôle et le nom actuels.

Lors d’un changement de PIN, rôle, statut ou transfert de propriété :

- incrémenter `session_version` ;
- invalider les anciennes sessions.

Durée de session recommandée : 30 jours, avec renouvellement contrôlé, plutôt que 180 jours immuables.

## 1.3 Rate limiting des PIN

Le déploiement Vercel étant distribué, éviter un compteur uniquement en mémoire.

### Migration suggérée

Créer `login_attempts` ou une fonction SQL dédiée avec :

- `player_id` ;
- hash de l’adresse IP ;
- fenêtre temporelle ;
- nombre d’échecs ;
- date de blocage ;
- dernière tentative.

Ne pas stocker l’adresse IP brute si elle n’est pas nécessaire.

### Règles initiales

- 5 échecs sur un joueur dans une fenêtre de 10 minutes ;
- délai progressif ;
- blocage temporaire ;
- message générique ;
- purge automatique des anciennes tentatives.

### PIN

- Conserver la compatibilité avec les PIN joueur à 4 chiffres pendant une transition.
- Exiger 6 chiffres pour tout nouveau PIN.
- Proposer une migration volontaire, puis obligatoire à terme.

## 1.4 Gestion des sessions

Ajouter dans le profil :

- `Déconnecter cet appareil` ;
- `Déconnecter tous mes appareils` ;
- date du dernier changement de PIN.

Une implémentation multi-appareils complète peut utiliser une table `sessions`. Si elle n’est pas ajoutée immédiatement, l’incrément de `session_version` doit au minimum permettre la révocation globale.

## Tests obligatoires

- admin rétrogradé : action refusée sans attendre l’expiration du cookie ;
- joueur archivé : session refusée ;
- PIN modifié : ancienne session refusée ;
- propriétaire uniquement : opération propriétaire acceptée ;
- autre admin : opération propriétaire refusée ;
- rate limit : blocage après le seuil ;
- retour à la normale après expiration de la fenêtre.

## Critères d’acceptation

- Aucun droit n’est lu uniquement depuis le cookie.
- Le prénom n’accorde jamais une permission.
- Les anciennes sessions sont révocables.
- Un PIN ne peut pas être bruteforcé à volonté.

---

# PHASE 2 — Sauvegardes, restauration et gestion des saisons

## But

Garantir que l’historique du club survive aux erreurs humaines, migrations et changements de saison.

## 2.1 Registre complet des tables sauvegardées

Centraliser la liste dans un module unique et inclure au minimum :

- `team_settings` ;
- `players` ;
- `seasons` ;
- `opponents` ;
- `matches` ;
- `availability` ;
- `match_players` ;
- `goals` ;
- `cards` ;
- `awards` ;
- `match_awards` ;
- `votes` ;
- `match_lineups` ;
- `dues` ;
- `player_badges` ;
- `player_measurements` ;
- `player_goals` ;
- blessures ;
- covoiturage ;
- matériel ;
- appels à renfort ;
- mémoire du club ;
- trophées ;
- profils publics ;
- futures tables ajoutées par cette roadmap.

Créer un test qui compare le registre aux tables applicatives connues. Toute nouvelle migration ajoutant une table métier doit obligatoirement mettre à jour le registre.

Fichiers probables :

- `src/lib/data/backups.ts`
- `src/lib/data/backups-actions.ts`
- `src/app/admin/sauvegardes/page.tsx`

## 2.2 Snapshot cohérent

Les lectures table par table ne garantissent pas un instant cohérent.

Créer une fonction PostgreSQL ou une procédure serveur qui construit le snapshot dans une transaction.

Le snapshot doit inclure :

- version du format ;
- date ;
- ID de saison active ;
- auteur ;
- nombre de lignes par table ;
- checksum ou empreinte du contenu ;
- version de l’application.

## 2.3 Stockage et export

Conserver deux niveaux :

1. sauvegarde dans la base pour les erreurs applicatives ;
2. fichier exporté hors de la base pour les incidents globaux.

Au minimum :

- bouton de téléchargement ;
- rappel si aucun export externe récent ;
- sauvegarde de fin de saison ;
- rétention configurable des sauvegardes internes.

## 2.4 Restauration progressive et soumise à validation

La restauration automatique globale ne doit pas être livrée immédiatement. Elle est trop risquée tant que les dépendances entre toutes les tables n’ont pas été éprouvées.

### Palier A — Immédiat : sauvegarde exploitable et procédure manuelle

Livrer d’abord :

- validation du format ;
- checksum ;
- inventaire des tables ;
- comparaison des compteurs ;
- téléchargement JSON ;
- procédure documentée de restauration manuelle ;
- sauvegarde obligatoire avant clôture ou opération destructive.

L’interface doit indiquer honnêtement :

> Sauvegarde téléchargeable. La restauration complète reste une opération administrateur assistée.

### Palier B — Restauration testée sur environnement isolé

Avant toute restauration de production :

1. créer une base de test ou un projet Supabase isolé ;
2. importer un snapshot réel anonymisé ou un dataset représentatif ;
3. restaurer les tables dans l’ordre des dépendances ;
4. recalculer et comparer les statistiques ;
5. exécuter les tests d’intégrité ;
6. documenter les écarts.

Commencer par :

- restauration d’un match ;
- puis restauration d’une saison ;
- puis seulement envisager la restauration globale.

### Palier C — Restauration transactionnelle de production

Ne l’activer que si les critères suivants sont satisfaits :

- au moins trois répétitions réussies sur environnement isolé ;
- tests automatisés sur toutes les tables sauvegardées ;
- procédure transactionnelle ;
- backup de l’état courant ;
- verrouillage temporaire des écritures ;
- aperçu détaillé de l’impact ;
- validation propriétaire ;
- journal complet ;
- stratégie de retour arrière testée.

Une restauration globale ne doit jamais être présentée comme un simple bouton ordinaire.

## 2.5 Remplacer la réinitialisation par un assistant de saison

Le mot « réinitialiser » doit disparaître du parcours normal.

### Assistant de clôture

1. afficher les matchs non terminés ;
2. afficher les incohérences ;
3. clôturer ou ignorer les votes ;
4. générer le bilan ;
5. générer la chronique ;
6. créer et télécharger une sauvegarde ;
7. verrouiller la saison ;
8. créer la saison suivante ;
9. choisir les joueurs actifs / archivés ;
10. choisir le traitement des cotisations ;
11. conserver tout l’historique.

Aucune suppression de matchs n’est nécessaire pour commencer une nouvelle saison.

## Tests obligatoires

- `player_goals` présent dans le backup ;
- ajout d’une table métier non enregistrée détecté par test ;
- restauration refusée avec checksum invalide ;
- restauration échouée : aucune modification partielle ;
- clôture : anciennes saisons intactes ;
- saison active unique ;
- propriétaire requis.

## Critères d’acceptation

- Changer de saison ne supprime aucune donnée historique.
- Une sauvegarde exploitable existe avant toute action risquée.
- Le contenu sauvegardé est vérifiable.
- Une procédure de restauration testée existe.

---

# PHASE 3 — Intégrité des données et transactions

## But

Empêcher les états partiels et incohérents, même en cas d’erreur réseau, double clic ou requête forgée.

## 3.1 Contraintes SQL

Ajouter ou vérifier :

- scores entiers et positifs ;
- minutes entre 0 et une limite raisonnable, par exemple 200 ;
- places de voiture positives ;
- poids / taille dans des plages plausibles ;
- une seule blessure active par joueur ;
- une seule saison active ;
- unicité des réponses par joueur et match ;
- unicité des confirmations et votes ;
- statut cohérent avec les dates ;
- type de but valide ;
- joueur concerné par un CSC Charenton facultatif mais jamais crédité comme buteur.

## 3.2 Transactions PostgreSQL

Créer des RPC transactionnelles pour les opérations multi-tables :

- remplacement de feuille de match ;
- duplication d’un match ;
- clôture de blessure + mise à jour des disponibilités ;
- restauration d’une entrée audit ;
- clôture de saison ;
- fusion de joueurs ;
- restauration ;
- fin de match et création des événements associés.

## 3.3 Vérification des relations

Chaque action sur un but ou un carton doit vérifier que :

- l’événement appartient au `matchId` fourni ;
- le match appartient à la saison attendue ;
- la saison n’est pas verrouillée ;
- le joueur est autorisé dans le contexte métier.

Ajouter systématiquement `.eq("match_id", matchId)` aux mises à jour et suppressions d’événements.

## 3.4 Verrouillage complet de saison

Étendre `assertMatchSeasonUnlocked()` à toute écriture historique :

- score ;
- date et adversaire ;
- feuille de match ;
- gardiens ;
- composition ;
- capitaine ;
- buts ;
- cartons ;
- récompenses ;
- votes ;
- correction d’événement ;
- suppression douce ;
- restauration depuis la corbeille.

La logistique future d’un match historique peut rester modifiable uniquement si elle n’affecte aucune statistique, mais cela doit être décidé explicitement.

## 3.5 Matchs à venir par date

Corriger `getNextMatch()` et `getUpcomingMatches()` :

- exclure les dates passées ;
- créer une liste admin `Matchs passés non finalisés` ;
- ne pas relancer automatiquement un ancien match resté `scheduled`.

Fichier probable : `src/lib/data/matches.ts`.

## 3.6 Joueurs archivés dans l’historique

Utiliser `getAllPlayers()` dans les vues historiques :

- anciens buts ;
- récompenses ;
- records ;
- mémoire ;
- trophées ;
- comparaisons historiques.

Réserver `getActivePlayers()` aux sélecteurs de nouvelles actions.

## Tests obligatoires

- insertion échouée de feuille de match : anciennes données conservées ;
- but d’un autre match : modification refusée ;
- saison verrouillée : toutes les écritures historiques refusées ;
- joueur archivé : nom toujours affiché ;
- ancien match programmé : absent de l’accueil ;
- double requête concurrente : aucune duplication.

---

# PHASE 4 — Socle UI/UX et navigation

## But

Préparer une interface cohérente pour les fonctions suivantes et améliorer immédiatement le mobile, le desktop et l’accessibilité.

## 4.1 Navigation à cinq onglets

Barre mobile :

- Accueil
- Matchs
- Équipe
- Stats
- Plus

Dans `Plus` :

- Records
- Trophées
- Mémoire
- Cotisations
- Boîte à idées
- Administration
- Aide
- Profil
- Nouveautés

Fichiers probables :

- `src/components/layout/BottomNav.tsx`
- `src/components/layout/AppShell.tsx`

## 4.2 Header simplifié

Sur mobile :

- logo / titre ;
- bouton avatar ouvrant un menu ;
- aide, profil et déconnexion dans le menu.

Éviter d’afficher simultanément nom, aide et déconnexion sur une largeur étroite.

## 4.3 Responsive desktop

Remplacer le `max-w-md` global par une largeur adaptative :

- mobile : une colonne ;
- desktop : jusqu’à `max-w-5xl` ou `max-w-6xl` ;
- accueil : deux colonnes ;
- fiche match : contenu + panneau actions ;
- stats : grille ;
- administration : tableaux plus larges.

## 4.4 Safe areas et PWA

Ajouter :

- `padding-top: env(safe-area-inset-top)` ;
- `padding-bottom: env(safe-area-inset-bottom)` ;
- espace pour la navigation fixe ;
- tests iPhone en mode standalone.

## 4.5 Composants transversaux

Créer ou consolider :

- `BottomSheet` ;
- `ConfirmDialog` ;
- `UndoToast` ;
- `EmptyState` ;
- `LoadingSkeleton` ;
- `ErrorState` ;
- `StatusBadge` ;
- `ResponsivePageContainer` ;
- `AdminQuickActions` ;
- `SectionAccordion`.

Ne pas introduire une nouvelle bibliothèque lourde si les composants peuvent être construits avec le socle existant.

## 4.6 Accessibilité

- cible tactile de 44 px minimum ;
- `aria-current="page"` ;
- nom accessible de la navigation ;
- focus visible ;
- labels explicites ;
- erreurs associées aux champs ;
- icône + texte pour chaque statut ;
- réduction des animations ;
- annonce accessible des toasts ;
- clavier numérique sur PIN et scores.

## 4.7 États de chargement et réseau

- skeletons, pas d’écran blanc ;
- statut `Enregistrement…`, `Enregistré`, `Échec` ;
- bouton Réessayer ;
- ne jamais afficher un succès avant confirmation serveur.

## Critères d’acceptation

- Navigation compréhensible sans connaître l’application.
- Aucun contenu principal coincé dans une colonne de téléphone sur desktop.
- Aucun bouton masqué par l’encoche ou la barre iPhone.
- Parcours clavier et lecteur d’écran utilisables.

---

# PHASE 5 — Cycle de vie du match et mode « Match en cours »

## But

Permettre aux admins et coachs de saisir les événements directement pendant le match, sans perdre le mode rapide après-match.

## 5.1 Modèle de statut

Conserver `matches.status` pour l’état principal :

- `draft`
- `scheduled`
- `live`
- `completed`
- `cancelled`
- `postponed`

Ajouter des champs séparés :

```sql
started_at timestamptz,
ended_at timestamptz,
completion_status text default 'not_started',
validated_at timestamptz,
validated_by_player_id uuid,
```

Valeurs de `completion_status` :

- `not_started`
- `incomplete`
- `under_review`
- `validated`

Éviter de multiplier les statuts dans une seule colonne, ce qui rendrait les transitions illisibles.

## 5.2 Démarrer un match

Bouton coach/admin : `▶ Démarrer le match`.

Règles :

- match non annulé ;
- saison déverrouillée ;
- statut `scheduled` ou `draft` ;
- confirmation si l’heure est très éloignée ;
- enregistrement de `started_at` et de l’auteur.

Route recommandée :

- `/matches/[id]/live`

## 5.3 Écran live

En-tête fixe :

- adversaire ;
- score ;
- état live ;
- chronomètre indicatif basé sur `started_at`, sans prétendre être officiel.

Actions principales :

- `+ But`
- `+ Carton`
- `+ Présent`
- `+ Note`
- `Terminer le match`

Buts :

- joueur ;
- passeur / aucun / inconnu ;
- minute facultative, préremplie par le chrono ;
- but normal ;
- CSC adverse ;
- CSC Charenton.

Chronologie :

- triée par minute puis création ;
- édition directe ;
- auteur visible aux admins ;
- bouton annuler immédiatement.

## 5.4 Gardien et feuille de match pendant le live

La colonne `match_players.goalkeeper` existe déjà et doit enfin être alimentée par l’interface.

Fonctions :

- définir un gardien principal depuis la feuille de match ;
- permettre plusieurs gardiens si nécessaire, sans minutes obligatoires ;
- bouton rapide `Définir comme gardien` ;
- affichage du gardien dans la composition, le résumé et le mode Jour de match ;
- avertissement non bloquant si aucun gardien n’est identifié ;
- conserver le gardien dans l’historique même si le joueur est archivé ensuite.

Dans le mode live, un admin peut changer le gardien sans effacer l’historique précédent. Si plusieurs gardiens sont enregistrés sans minutes, les statistiques de buts encaissés individuels doivent être affichées comme non attribuables précisément.

## 5.5 Concurrence

Au minimum :

- `updated_at` et verrouillage optimiste ;
- détection si un événement a changé depuis l’ouverture ;
- rechargement sans écraser le travail.

Idéalement :

- abonnement Supabase Realtime aux buts, cartons et match ;
- prévention de double clic côté client et serveur ;
- identifiant d’idempotence pour chaque création d’événement.

## 5.6 Fin du match

Bouton `⏹ Terminer le match` :

1. confirmer le score ;
2. enregistrer `ended_at` ;
3. passer en `completed` + `completion_status = incomplete` ;
4. afficher la checklist de complétude ;
5. proposer la feuille de match ;
6. proposer les votes ;
7. permettre `Compléter plus tard`.

## 5.7 Résultat express maintenu

Le mode live n’est jamais obligatoire.

Après un match, un admin peut toujours saisir :

- score ;
- présents ;
- sauvegarder immédiatement.

## 5.8 Verrouillage du groupe convoqué

Une fois le groupe décidé, le coach peut cliquer sur `Valider le groupe`.

Le verrouillage concerne :

- convoqués ;
- liste d’attente ;
- gardien prévu ;
- capitaine ;
- composition publiée.

Règles :

- le coach peut toujours déverrouiller avec confirmation ;
- toute modification après verrouillage est journalisée ;
- le verrouillage du groupe ne remplace jamais la feuille de présence réelle ;
- un joueur arrivé au dernier moment peut être ajouté au match réel ;
- les joueurs voient clairement s’ils sont convoqués ou en attente.

## 5.9 Saisie groupée des buts après le match

Conserver l’ajout unitaire pour le mode live, mais ajouter un mode groupé pour la saisie après-match.

Exemple :

```text
Karim        2
Amine        1
CSC adverse  1
```

Puis proposer une étape facultative d’attribution des passeurs.

Règles :

- accepter un buteur inconnu ;
- accepter aucun passeur ou passeur inconnu ;
- intégrer les CSC des deux côtés ;
- créer les événements de façon transactionnelle ;
- empêcher un double envoi ;
- permettre l’annulation du lot immédiatement après création.

## Tests obligatoires

- gardien principal enregistré ;
- plusieurs gardiens acceptés ;
- aucun gardien : avertissement non bloquant ;
- groupe verrouillé puis modifié avec audit ;
- verrouillage du groupe distinct de la présence réelle ;
- saisie groupée cohérente avec le score ;
- démarrage et fin ;
- double démarrage refusé ;
- événement live idempotent ;
- CSC correctement compté ;
- fin sans buteurs détaillés acceptée ;
- saison verrouillée refusée ;
- deux admins ne créent pas le même événement deux fois.

## Critères d’acceptation

- Une personne debout au bord du terrain peut ajouter un but en moins de 10 secondes.
- Le match reste utilisable si le réseau coupe puis revient.
- Terminer un match ne force pas à compléter tous les détails.

---

# PHASE 6 — Disponibilité avancée, restrictions et rotation

## But

Éviter les relances inutiles, gérer les retours progressifs et aider les coachs à faire tourner le groupe sans créer un classement humiliant.

## 6.1 Consolider les blessures existantes

Vérifier que :

- une seule blessure active existe par joueur ;
- les matchs avant le retour estimé passent automatiquement en blessé ;
- le joueur n’est pas dans les sans-réponse ;
- une présence ne clôture jamais silencieusement la blessure.

Quand un joueur blessé choisit Présent :

- `Je suis rétabli` ;
- `Je joue malgré la blessure` ;
- `La date était incorrecte` ;
- `Annuler`.

## 6.2 Restrictions temporaires

Créer une table séparée, sans détails médicaux :

```sql
player_restrictions (
  id uuid primary key,
  player_id uuid not null,
  starts_at date not null,
  ends_at date,
  status text not null,
  restriction_types text[] not null,
  comment text,
  visibility text not null default 'coaches',
  created_at timestamptz not null,
  ended_at timestamptz
)
```

Types initiaux :

- `no_goalkeeper`
- `no_defence`
- `no_attack`
- `no_intense_running`
- `limited_play_time`
- `progressive_return`
- `custom`

Les coachs voient une alerte dans la composition, sans blocage absolu.

## 6.3 Historique de disponibilité

Conserver uniquement :

- période indisponible ;
- retour prévu ;
- retour réel ;
- retour progressif ;
- présence malgré blessure ;
- restriction temporaire.

L’historique est privé au joueur et aux rôles autorisés.

## 6.4 Date limite de réponse

Ajouter aux matchs :

```sql
response_deadline timestamptz,
```

Dans `availability`, conserver :

```sql
first_responded_at timestamptz,
last_changed_at timestamptz,
late_response boolean
```

La relance doit exclure :

- joueurs blessés ;
- joueurs indisponibles sur la période ;
- joueurs archivés ;
- joueurs ayant déjà répondu.

## 6.5 Rotation équitable

Créer une fonction de suggestion privée aux coachs, fondée sur :

- disponibilités récentes ;
- matchs réellement joués ;
- fois disponible mais non retenu ;
- sélections consécutives ;
- besoins de poste ;
- restrictions.

Ne pas stocker un « score de valeur » public.

La suggestion doit expliquer sa raison :

> Bilal était disponible lors des quatre derniers matchs, mais n’a joué qu’une fois.

Le coach reste décisionnaire.

## 6.6 Fiabilité organisationnelle positive

Calculer des signaux, pas une note publique :

- répond généralement à temps ;
- prévient en cas de changement ;
- présence cohérente ;
- tâches généralement confirmées.

Visibilité : joueur concerné et admins, jamais classement public.

## 6.7 Statistiques admin de ponctualité

- délai moyen de réponse ;
- taux avant deadline ;
- sans-réponse à J-3 ;
- évolution mensuelle ;
- tendance collective.

## Tests obligatoires

- blessé exclu des relances ;
- présence ponctuelle malgré blessure ;
- clôture explicite ;
- restriction visible seulement selon sa visibilité ;
- réponse tardive calculée correctement ;
- rotation n’inclut pas un joueur indisponible ;
- aucun classement négatif exposé.

---

# PHASE 7 — Logistique enrichie et checklist personnelle

## But

Faire de l’application le point central du jour de match sans la transformer en formulaire permanent.

## 7.1 Registre des terrains

Créer `venues` :

- nom ;
- adresse ;
- Maps ;
- parking ;
- vestiaires ;
- code d’accès ;
- surface ;
- éclairage ;
- commentaire pratique.

Ajouter `venue_id` aux matchs tout en conservant les champs actuels pendant la migration.

Permettre :

- réutilisation ;
- modification locale pour un match ;
- fusion de doublons.

## 7.2 Covoiturage enrichi

À partir du système existant :

- assigner des passagers ;
- afficher places restantes ;
- point et heure de départ ;
- contact via lien approprié, sans rendre le numéro public ;
- alerte si déficit de places ;
- ne jamais recopier automatiquement les réponses sur le match suivant.

## 7.3 Matériel et rotation

Ajouter :

- statut `assigné`, `confirmé`, `apporté`, `oublié` ;
- suggestion basée sur l’historique ;
- bouton `Reprendre le matériel du match précédent` ;
- possibilité de réassigner automatiquement les tâches selon la fréquence passée ;
- éléments personnalisables ;
- suggestion facultative de rotation du capitanat selon les capitanats précédents.

Aucune reprise automatique ne doit assigner silencieusement un joueur. L’admin valide toujours la proposition.

## 7.4 Checklist personnelle

Créer :

- modèles d’items par équipe ;
- items personnels ;
- items contextuels générés.

Exemples contextuels :

- apporter les ballons ;
- prendre un joueur ;
- être capitaine ;
- cotisation restante ;
- prendre les clés.

La checklist :

- est privée ;
- se coche instantanément ;
- se réinitialise après le match ;
- n’affecte pas une statistique publique.

Tables possibles :

```sql
checklist_templates
player_checklist_preferences
match_checklist_items
```

## 7.5 Mode jour de match

L’accueil affiche automatiquement :

- RDV ;
- coup d’envoi ;
- itinéraire ;
- nombre de présents ;
- capitaine ;
- gardien ;
- checklist ;
- tâches ;
- covoiturage ;
- alertes utiles.

## 7.6 Modèles génériques de matchs

Le bouton existant `Rejouer contre cet adversaire` est conservé, mais complété par des modèles indépendants de l’adversaire.

Exemples :

- vendredi soir à Charenton ;
- match extérieur ;
- tournoi ;
- match à cinq ;
- créneau habituel.

Un modèle peut mémoriser :

- lieu ;
- horaires ;
- délai de rendez-vous ;
- type de match ;
- nombre maximum de joueurs ;
- matériel habituel ;
- règles de convocation.

Il ne doit jamais recopier automatiquement :

- les réponses de présence ;
- le covoiturage ;
- les blessures ;
- les paiements.

## Critères d’acceptation

- Toutes les informations pratiques sont visibles sans fouiller plusieurs pages.
- La checklist n’ajoute aucune obligation à l’équipe.
- Les conducteurs et passagers comprennent immédiatement l’organisation.

---

# PHASE 8 — Corrections, validation collective et annulation rapide

## But

Permettre à l’équipe de corriger la mémoire collective sans donner à tous les joueurs un accès d’administration.

## 8.1 Demandes de correction

Créer `correction_requests` :

- auteur ;
- match ;
- type ;
- cible ;
- ancienne valeur ;
- nouvelle valeur proposée ;
- commentaire ;
- statut ;
- traité par ;
- dates.

Types :

- score ;
- buteur ;
- passeur ;
- présence ;
- carton ;
- gardien ;
- capitaine ;
- autre.

L’admin peut :

- accepter ;
- refuser ;
- modifier puis accepter.

L’acceptation applique la modification dans une transaction et écrit l’audit.

## 8.2 Confirmation collective

Créer `match_confirmations` :

- match ;
- joueur ;
- `confirmed` ou `issue_reported` ;
- date.

Seuls les joueurs présents peuvent confirmer.

Après un délai configurable :

- le match passe en `under_review` puis `validated` ;
- la validation peut rester manuelle au départ.

## 8.3 Page admin « À valider »

Regrouper :

- matchs incomplets ;
- incohérences ;
- corrections ;
- votes ouverts ;
- invités à fusionner ;
- sauvegardes anciennes ;
- problèmes de données.

Route recommandée : `/admin/review` ou extension de `/matches/review`.

## 8.4 Annulation rapide

Pour les petites actions, retourner un identifiant d’audit ou d’opération annulable.

Afficher pendant 10 à 15 secondes :

> But supprimé. Annuler

Actions :

- but ;
- carton ;
- présence ;
- tâche ;
- statut ;
- anecdote ;
- clôture de blessure.

Les actions massives gardent confirmation + sauvegarde ; elles ne dépendent jamais d’un toast de dix secondes.

## 8.5 Joueurs invités et fusion contrôlée

Créer un vrai cycle de vie pour les invités :

- invité ponctuel lié à un ou plusieurs matchs ;
- conversion en joueur permanent ;
- fusion avec un joueur existant ;
- aperçu des données transférées ;
- backup obligatoire avant fusion ;
- transaction unique ;
- conservation des buts, passes, présences, cartons et récompenses ;
- journal d’audit.

La page `À valider` doit afficher :

- invités récurrents à convertir ;
- doublons probables ;
- fusions en attente.

## Tests obligatoires

- fusion conserve tout l’historique ;
- fusion échouée ne modifie rien ;
- backup créé avant fusion ;
- joueur ne modifie pas directement un but ;
- correction acceptée applique exactement le changement ;
- correction refusée ne modifie rien ;
- correction sur saison verrouillée refusée ou passe par déverrouillage contrôlé ;
- undo dans le délai fonctionne ;
- undo expiré est refusé ;
- confirmation réservée aux présents.

---

# PHASE 9 — Liens directs, découvrabilité et accès public

## But

Réduire les clics depuis WhatsApp et rendre les fonctions secondaires trouvables.

## 9.1 Deep links authentifiés

Tous les partages doivent pouvoir ouvrir l’action exacte :

- présence ;
- covoiturage ;
- vote ;
- correction ;
- checklist ;
- blessure ;
- installation PWA ;
- match live.

Si l’utilisateur n’est pas connecté :

1. redirection vers login avec un paramètre `next` ;
2. connexion ;
3. retour à l’action.

Valider `next` pour empêcher les redirections externes.

## 9.2 Connexion améliorée

- continuer en tant que dernier joueur ;
- bouton Ce n’est pas moi ;
- recherche ;
- joueurs récents ;
- avatars / initiales ;
- sélection plus compacte au-delà de 20 joueurs.

## 9.3 Service générique de liens publics temporaires

Extraire le mécanisme token / expiration / révocation déjà utilisé par les appels à renfort.

Créer une couche commune pour :

- appel à renfort ;
- profil public ;
- fiche match publique ;
- composition ;
- bilan de saison ;
- galerie ponctuelle.

Chaque lien doit définir :

- type de ressource ;
- ressource ciblée ;
- token haché ou sécurisé ;
- date d’expiration ;
- date de révocation ;
- permissions de lecture ;
- auteur.

Ne pas créer un système de token différent dans chaque module.

## 9.4 QR codes

- accès équipe ;
- prochain match ;
- appel à renfort ;
- page publique ;
- profil public ;
- calendrier.

Les QR publics doivent utiliser des tokens révocables.

## 9.5 Régénération des tokens

Ajouter :

- régénérer calendrier ;
- régénérer profil public ;
- révoquer un lien ;
- date de dernière génération.

## Critères d’acceptation

- Un clic WhatsApp mène à l’action en deux interactions maximum après identification.
- Aucun paramètre `next` ne permet une redirection hors du site.
- Un token compromis peut être invalidé immédiatement.

---

# PHASE 10 — Statistiques et résumés intelligents

## But

Créer de la valeur à partir des données existantes, sans nouvelle saisie manuelle.

## 10.1 Architecture de calcul

Privilégier :

- fonctions pures testées ;
- vues SQL pour les agrégats lourds ;
- requêtes calculées à la demande ;
- cache seulement après mesure.

Ne pas dupliquer les totaux dans plusieurs tables sans stratégie claire de recalcul.

## 10.2 Duo le plus décisif

Calculer :

- passeur → buteur ;
- nombre de combinaisons ;
- dernière combinaison ;
- saison / mois / historique ;
- réciprocité éventuelle.

Minimum d’affichage : deux combinaisons.

## 10.3 Résumé personnel mensuel

Générer :

- matchs ;
- buts ;
- passes ;
- contributions ;
- présence ;
- victoires ;
- récompenses ;
- jalons ;
- meilleure série.

Le partage est volontaire.

## 10.4 Records imminents

Afficher :

- palier à un but / match / passe ;
- série proche d’un record ;
- duo proche d’un record.

Éviter des annonces absurdes sur un échantillon minuscule.

## 10.5 Statistiques gardiens

Utiliser les données gardien saisies dans la Phase 5.

Calculer :

- matchs gardien ;
- clean sheets ;
- victoires ;
- buts encaissés lorsque l’attribution est fiable ;
- moyenne par match.

Si plusieurs gardiens sont enregistrés sans répartition temporelle, ne pas attribuer artificiellement tous les buts encaissés à l’un d’eux.

Ne jamais inventer les arrêts sans saisie.

## 10.6 Filtres

- saison ;
- mois ;
- cinq derniers matchs ;
- domicile / extérieur ;
- jour de semaine.

Les filtres doivent partager une logique unique et être encodables dans l’URL.

## 10.7 Statistiques organisationnelles

Réservées aux admins et au joueur concerné :

- ponctualité des réponses ;
- cohérence présence / réponse ;
- tâches confirmées ;
- charge des organisateurs.

Ne pas créer de leaderboard négatif.

## Tests obligatoires

- duo avec sens correct ;
- CSC exclu ;
- but sans passe exclu ;
- joueur archivé inclus dans l’historique ;
- mois et fuseau horaire corrects ;
- gardien identifié ;
- confidentialité respectée.

---

# PHASE 11 — Engagement, mémoire et communication

## But

Donner envie de revenir dans l’application et transformer les saisons en souvenirs, sans recréer un réseau social complet.

## 11.1 Boîte à idées

Créer `ideas` et éventuellement `idea_votes` / `idea_comments`.

Catégories :

- application ;
- organisation ;
- matériel ;
- règle ;
- récompense ;
- événement.

Statuts :

- proposée ;
- à étudier ;
- retenue ;
- planifiée ;
- réalisée ;
- refusée.

Commentaires courts, modération admin, pas d’anonymat complet.

## 11.2 Objectifs collectifs secrets

Créer `secret_objectives` avec :

- règle ;
- période ;
- progression calculée ;
- indice facultatif ;
- date de déblocage ;
- carte partageable.

Commencer par des modèles prédéfinis :

- matchs sans carton ;
- nombre de buteurs différents ;
- présence collective ;
- série de victoires ;
- remontée au score si cette donnée devient calculable.

## 11.3 Chronique automatique de saison

Générer un brouillon à partir de :

- résultats ;
- séries ;
- records ;
- jalons ;
- trophées ;
- retours de joueurs, sans mentionner la nature d’une blessure.

La chronique est modifiable, versionnée et figée avec la saison.

## 11.4 Changelog visible

Pour les versions de l’application, préférer une source versionnée dans le code :

- `src/content/changelog.ts` ou Markdown statique ;
- version ;
- date ;
- nouveautés ;
- corrections.

Afficher un badge une seule fois par version consultée.

## 11.5 Signalement de bug

Créer `bug_reports` :

- auteur facultatif ;
- description ;
- page ;
- appareil ;
- navigateur ;
- version ;
- capture ou URL facultative ;
- statut ;
- référence publique.

Ne jamais collecter automatiquement le PIN, les cookies ou des données privées de page.

## 11.6 Réactions limitées

Si ajoutées, limiter à quelques emojis sur des objets précis :

- résumé de match ;
- citation ;
- souvenir ;
- photo autorisée.

Pas de fil social général, pas de réaction sur les mesures, blessures ou données financières.

## 11.7 Cycle formel des votes

Unifier les votes de match, joueur du mois et trophées de saison autour d’un cycle explicite :

- `draft`
- `open`
- `closed`
- `published`
- `archived`

Chaque campagne de vote contient :

- type ;
- période ou match ;
- catégories ;
- date d’ouverture ;
- date de clôture ;
- visibilité des résultats ;
- droit de modifier son vote ;
- auteur ;
- date de publication.

### Joueur du mois

1. calculer trois nominés sur des critères transparents ;
2. ouvrir le vote ;
3. cacher les résultats jusqu’à la clôture ;
4. publier le gagnant ;
5. générer une carte partageable.

### Trophées de fin de saison

Permettre :

- attribution automatique des trophées purement statistiques ;
- vote d’équipe pour les trophées subjectifs ;
- nomination préalable facultative ;
- clôture et publication ;
- ajout dans la frise et la chronique de saison.

La page `À valider` doit afficher les votes à clôturer ou publier.

## 11.8 Défis collectifs personnalisables

Conserver les défis fixes actuels.

Dans une deuxième étape, permettre aux admins de créer un défi à partir de modèles contrôlés :

- métrique autorisée ;
- opérateur ;
- cible ;
- période ;
- secret ou public ;
- récompense éventuelle.

Ne pas permettre de code libre ni de requêtes SQL saisies par l’utilisateur.

## 11.9 Citations liées à un match

Le mur des citations doit pouvoir associer une citation à :

- un match précis ;
- un joueur facultatif ;
- une saison ;
- un contexte libre.

Conserver le champ texte libre, mais ajouter un sélecteur de match optionnel pour fiabiliser l’historique.

---

# PHASE 12 — Page publique, médias et stockage

## But

Permettre de présenter le club et partager des souvenirs sans exposer les données privées.

## 12.1 Paramètres publics du club

Ajouter des réglages explicites :

- page publique activée ;
- indexation par moteurs ;
- prochain match visible ;
- résultats visibles ;
- joueurs publics ;
- stats visibles ;
- galerie visible ;
- contact public.

## 12.2 Page publique

Contenu possible :

- logo ;
- présentation ;
- dernier résultat ;
- prochain match ;
- buteurs ;
- palmarès ;
- histoire ;
- photos autorisées.

Ne jamais exposer :

- disponibilités ;
- blessures ;
- restrictions ;
- cotisations ;
- mesures ;
- date de naissance complète ;
- covoiturage ;
- PIN ;
- notes admin.

## 12.3 Supabase Storage et upload direct

Cette phase remplace progressivement les URL externes par un upload direct sécurisé pour :

- photos de profil ;
- photos de match ;
- frise et souvenirs ;
- historique des maillots ;
- captures de signalement de bug.

Créer des buckets séparés :

- `public-media` ;
- `private-media` ;
- éventuellement `bug-report-media`.

Règles :

- types autorisés ;
- taille maximale ;
- compression ;
- suppression douce ou traçable ;
- URL signée pour le privé ;
- consentement et visibilité.

## 12.4 Galerie

- photo principale par match ;
- albums saison ;
- légendes ;
- consentement ;
- pas d’upload vidéo lourd dans Vercel.

Pour les vidéos, privilégier des liens externes ou un service adapté.

## 12.5 Cartes partageables

Conserver et étendre les cartes existantes :

- résultat ;
- composition ;
- joueur ;
- mois ;
- record ;
- objectif secret ;
- appel à renfort.

## Tests obligatoires

- page publique sans session ;
- données privées absentes ;
- média privé inaccessible sans autorisation ;
- token révoqué ;
- fichier trop lourd refusé ;
- type dangereux refusé.

---

# PHASE 13 — Notifications et PWA avancée

## But

Envoyer peu de notifications, mais au bon moment, en respectant les préférences et la vie privée.

Cette phase est volontairement tardive.

## 13.1 Service worker

Ajouter un service worker contrôlé pour :

- notifications ;
- cache minimal ;
- mise à jour ;
- page hors ligne explicite.

Ne pas cacher agressivement les données dynamiques ou administratives.

## 13.2 Modèle de données

Créer :

- `push_subscriptions` ;
- `notification_preferences` ;
- `notification_events` ou file d’envoi ;
- historique minimal des envois.

Gérer plusieurs appareils par joueur.

## 13.3 Catégories

- nouveau match ;
- rappel sans réponse ;
- changement heure / lieu ;
- match aujourd’hui ;
- covoiturage ;
- tâche ;
- résultat ;
- vote ;
- cotisation ;
- annonce.

## 13.4 Règles anti-spam

- préférences par catégorie ;
- importantes uniquement ;
- heures silencieuses ;
- regroupement ;
- un seul rappel automatique de présence par échéance ;
- pas de notification pour chaque but ou changement mineur.

## 13.5 Cache et hors ligne

Première version limitée :

- consulter le prochain match déjà chargé ;
- conserver un brouillon local de score ou correction ;
- signaler clairement ce qui n’est pas synchronisé.

Ne jamais afficher « Enregistré » avant synchronisation serveur.

---

# PHASE 14 — Fonctions expérimentales

## But

Explorer des gains réels après stabilisation complète, sans laisser l’IA modifier silencieusement les données.

## 14.1 Saisie vocale

Transformer une phrase en **brouillon** :

> Victoire 4-2, deux buts Karim, un but Amine, un CSC adverse, jaune pour Nabil.

Toujours afficher un écran de vérification avant écriture.

## 14.2 Résumés automatiques

Tons :

- sobre ;
- journalistique ;
- encourageant ;
- vestiaire ;
- réseaux sociaux.

Le texte est modifiable et jamais publié automatiquement.

## 14.3 Détection intelligente d’erreurs

Signaler :

- buteur absent ;
- carton d’un non-participant ;
- score incohérent ;
- événement dupliqué ;
- CSC mal compté ;
- joueur blessé aligné sans confirmation.

L’assistant propose, il ne corrige pas seul.

## 14.4 Recherche en langage naturel

Exemples :

- Qui est proche d’un record ?
- Quel est notre bilan le vendredi ?
- Quel duo a créé le plus de buts ?
- Quels matchs sont incomplets ?

Implémenter d’abord une couche de requêtes déterministes ; utiliser un modèle de langage uniquement pour interpréter la demande, pas pour inventer le résultat.

---

# 5. Registre consolidé des anciennes fonctionnalités différées

## Réintroduites dans les phases principales

| Élément | Phase |
|---|---:|
| Terrains enregistrés et réutilisables | 7 |
| Matériel du match précédent | 7 |
| Rotation du capitanat | 7 |
| Date limite et réponse tardive | 6 |
| Groupe convoqué verrouillable | 5 |
| Ajout groupé de buts | 5 |
| Corrections proposées par les joueurs | 8 |
| Page À valider complète | 8 |
| Modèles génériques de matchs | 7 |
| QR codes | 9 |
| Liens publics génériques | 9 |
| Gardien par match | 5 |
| Statistiques gardien | 10 |
| Upload direct de photos | 12 |
| Citation liée à un match | 11 |
| Votes formels mensuels et saisonniers | 11 |
| Réactions limitées | 11 |
| Défis personnalisables contrôlés | 11 |
| Audit des joueurs archivés | 3 |

## Conservées sous une forme simplifiée

- feature flags légers uniquement ;
- Hall of Fame avec numéro retiré facultatif ;
- URL externe conservée tant que Storage n’est pas déployé ;
- statistiques sportives visibles dans l’équipe ;
- rôles admin simples ;
- défis fixes avant le configurateur ;
- duplication d’un ancien match en complément des modèles.

## Toujours différées

- restauration globale de production en un clic avant validation complète ;
- permissions admin temporaires et granulaires ;
- upload vidéo lourd ;
- mode hors ligne complet ;
- système social général ;
- formules de défis totalement libres.

---

# 6. Backlog secondaire à conserver

Ces idées sont possibles après la roadmap principale, mais ne doivent pas ralentir les phases prioritaires :

- gestion complète des maillots ;
- dépenses d’équipe ;
- reçus de cotisation ;
- mode tournoi ;
- liste d’attente formelle ;
- groupe de renforts récurrents ;
- réservations de terrain ;
- objets perdus ;
- quiz historique ;
- capsule temporelle ;
- numéros retirés ;
- Hall of Fame enrichi ;
- but du mois ;
- album « une photo par match » ;
- comparaison saison N / N-1 ;
- administrateur temporaire granulaire ;
- page de statut technique.

---

# 7. Fonctions explicitement hors périmètre

Sauf décision ultérieure claire, ne pas développer :

- minutes jouées obligatoires ;
- tirs, tacles et duels manuels ;
- GPS ou localisation en direct ;
- notes publiques de niveau ;
- classement du pire joueur ;
- diagnostic médical ;
- chat ou réseau social complet ;
- paris avec argent ;
- reconnaissance faciale ;
- sélection automatique opaque ;
- publication publique par défaut ;
- IA qui modifie directement les statistiques sans validation.

---

# 8. Stratégie de tests

## 8.1 Tests unitaires

Pour :

- calculs statistiques ;
- règles de CSC ;
- séries ;
- duo décisif ;
- fiabilité positive ;
- deadlines ;
- visibilité ;
- transitions de statut.

## 8.2 Tests d’intégration serveur

Pour :

- permissions ;
- sessionVersion ;
- rate limiting ;
- opérations transactionnelles ;
- saison verrouillée ;
- correction ;
- backup et restauration ;
- deep links.

## 8.3 Tests end-to-end prioritaires

Ajouter Playwright ou équivalent lorsque la Phase 1 est stabilisée.

Parcours :

1. joueur se connecte et répond ;
2. blessé choisit de jouer malgré la blessure ;
3. admin crée et démarre un match ;
4. admin ajoute un but live ;
5. admin termine et complète ;
6. joueur propose une correction ;
7. admin accepte ;
8. saison verrouillée refuse une modification ;
9. propriétaire crée un backup et clôture ;
10. ancien admin rétrogradé ne peut plus agir.

## 8.4 Tests visuels et responsive

- petit Android ;
- iPhone avec safe areas ;
- tablette ;
- desktop 1440 px ;
- PWA standalone ;
- mode réduction des animations.

---

# 9. Observabilité et exploitation

Ajouter progressivement :

- identifiant d’erreur présenté à l’utilisateur ;
- logs structurés sans secrets ;
- suivi des migrations appliquées ;
- audit des actions sensibles ;
- statistiques d’échec des Server Actions ;
- alerte sur backup ancien ;
- page admin de santé des données ;
- cron surveillé et journalisé.

Toute erreur doit être formulée pour l’utilisateur :

> La modification n’a pas été enregistrée. Réessaie.

et non :

> Validation failed for payload relation mismatch.

PostgreSQL peut conserver son lyrisme pour les logs.

---

# 10. Ordre de déploiement recommandé

## Release 1 — Sécurité immédiate

- Phase 0
- Phase 1
- désactivation de la réinitialisation

**Gate :** audit de permissions réussi.

## Release 2 — Historique protégé

- Phase 2
- Phase 3

**Gate :** clôture de saison testée sur une copie de données.

## Release 3 — Refonte UX

- Phase 4
- améliorations connexion / navigation

**Gate :** vérification mobile et desktop.

## Release 4 — Match en direct

- Phase 5
- annulation rapide minimale de Phase 8

**Gate :** test terrain avec faux match.

## Release 5 — Disponibilités et organisation

- Phase 6
- Phase 7

**Gate :** blessés exclus des relances, checklist non intrusive.

## Release 6 — Qualité collaborative

- Phase 8
- Phase 9

**Gate :** correction joueur → admin testée de bout en bout.

## Release 7 — Valeur statistique

- Phase 10

**Gate :** aucun nouveau champ manuel nécessaire.

## Release 8 — Vie du club

- Phase 11
- Phase 12

**Gate :** audit de confidentialité public/privé.

## Release 9 — Notifications

- Phase 13

**Gate :** préférences et anti-spam validés.

## Release 10 — Expérimental

- Phase 14

**Gate :** aucune écriture automatique non validée.

---

# 11. Format de rapport attendu après chaque lot

L’agent doit produire un compte rendu contenant :

## Résumé

- objectif du lot ;
- résultat livré ;
- fonctions visibles.

## Modifications techniques

- migrations ;
- tables / colonnes ;
- Server Actions ;
- composants ;
- routes ;
- permissions.

## Tests

- commandes exécutées ;
- nombre de tests ;
- scénarios manuels.

## Risques et limites

- points non traités ;
- dette créée ;
- migration de données ;
- rollback.

## Fichiers principaux modifiés

Liste concise des fichiers.

## Validation utilisateur

Scénarios exacts à tester dans l’application.

---

# 12. Priorité ultime

L’ordre des priorités est non négociable :

1. **ne pas perdre les données** ;
2. **ne pas accorder de faux droits** ;
3. **ne pas créer d’états incohérents** ;
4. **rendre le match rapide à gérer** ;
5. **améliorer l’organisation** ;
6. **valoriser les données existantes** ;
7. **ajouter du fun** ;
8. **ajouter l’expérimental**.

La meilleure version de Charenton FC n’est pas celle qui contient le plus d’écrans. C’est celle que l’équipe utilise encore dans trois saisons, avec des statistiques intactes, une organisation plus simple et aucun administrateur obligé de reconstituer manuellement quarante matchs après avoir appuyé sur le mauvais bouton.
