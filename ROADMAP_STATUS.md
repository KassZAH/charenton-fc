# Charenton FC — État de la Roadmap V2

_Analyse produite le 18 juillet 2026, après le sprint d'audit (commits `2ad6a2b` → `107df94`)._

_Document d'analyse pur — aucune modification de code, aucune migration exécutée pendant sa rédaction._

## Méthode

Chaque sous-fonctionnalité de `ROADMAP_IMPLEMENTATION_IDEALE_CHARENTON_FC_V2.md` a été vérifiée contre :
- le schéma réel (`src/types/database.ts`, régénéré après la dernière migration appliquée) ;
- les 15 migrations présentes dans `supabase/migrations/` (dont 5 posées par le sprint d'audit de ce jour) ;
- les Server Actions dans `src/lib/data/*-actions.ts` (46 fichiers) ;
- les pages dans `src/app/` (39 routes) ;
- les tests dans `src/**/*.test.ts` (10 fichiers, 56 tests).

Statuts possibles : **DÉJÀ IMPLÉMENTÉ** · **PARTIELLEMENT IMPLÉMENTÉ** · **À CORRIGER** · **À IMPLÉMENTER** · **TOUJOURS DIFFÉRÉ** · **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** · **ABANDONNÉ**.

---

# PHASE 0 — Gel de sécurité et baseline

## 0.1 Désactiver temporairement la réinitialisation

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe : `resetSeasonData()` (`src/lib/data/reset-actions.ts`) a été durci lors du sprint P0 (`2ad6a2b`) — `requireAdmin()` au lieu d'un contrôle par prénom, suppression **scopée à `season_id`** au lieu de toutes les saisons, confirmation par saisie exacte du nom de la saison, sauvegarde automatique avant suppression. **Mis à jour (Lot 2 de la roadmap V3, commit `960cda0`, déployé en production le 18/07/2026) :** l'action est désormais neutralisée par `SEASON_RESET_ENABLED = false` (`src/lib/data/reset-flags.ts`), vérifié tout en haut de la fonction, avant toute lecture de saison ou création de sauvegarde — un appel direct (contournant l'UI) ne modifie donc plus rien du tout. Le bouton a été retiré de `/profile`, remplacé par un lien vers `/admin/saisons` (`startNewSeason`, voir Phase 2.5), qui reste l'unique parcours normal. `ResetButton.tsx` est conservé sur disque mais n'est plus importé nulle part.

Ce qui manque : rien par rapport au périmètre de ce lot. Le code de `resetSeasonData()` reste dans le dépôt (volontairement, au cas où) — sa suppression définitive n'est pas prévue tant qu'aucun besoin ne l'exige.

Fichiers concernés : `src/app/profile/ResetButton.tsx` (orphelin), `src/app/profile/page.tsx`, `src/lib/data/reset-actions.ts`, `src/lib/data/reset-flags.ts`.
Tables/migrations : aucune.
Risque sur données existantes : résolu — vérifié en preview et confirmé par requête de contrôle (compteurs `backups`/`matches` identiques avant/après un appel direct refusé).
Tests ajoutés : `src/lib/data/reset-flags.test.ts` (flag désactivé par défaut).
Migration nécessaire : non.
Déployable indépendamment : oui — déjà déployé.
Feature flag léger : oui, en place (`SEASON_RESET_ENABLED`, constante de code — pas de colonne `team_settings`, jugé suffisant).

## 0.2 Baseline de tests

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : 56 tests dans 10 fichiers, mais **exclusivement sur des fonctions pures** (`clock.ts`, `format.ts`, `formations.ts`, `funny-lines.ts`, `ics.ts`, `maps.ts`, `visibility.ts`, `whatsapp.ts`, `goals.ts::computeScorerName`, `text.ts::normalize`). La philosophie du projet (documentée dans le README ajouté ce jour) écarte volontairement le mock de base de données ; la couverture des permissions/verrouillage/CSC listée en §0.2 a été vérifiée **manuellement** contre une vraie base à chaque lot de l'audit (P0 à P2), pas par des tests automatisés reproductibles.

Ce qui manque : aucun test automatisé pour login réussi/échoué, permission joueur/coach/admin, ajout/suppression de but avec verrouillage, réponse de présence, sauvegarde contenant les tables essentielles. `computeScorerName` couvre déjà le CSC des deux côtés (`goals.test.ts`).

Fichiers concernés : `src/lib/auth/*.ts`, `src/lib/data/goals-actions.ts`, `src/lib/data/season-lock.ts`, `src/lib/data/backups.ts`.
Tables/migrations : aucune nouvelle.
Dépendances techniques : nécessite de décider si le projet introduit un mock Supabase léger ou continue le socle "fonctions pures uniquement" (choix produit, pas juste technique).
Risque sur données existantes : aucun (tests).
Effort estimé : **M** (si on reste sur des fonctions pures extraites) à **L** (si on introduit un vrai test d'intégration avec base de test).
Tests déjà présents : CSC (goals.test.ts), formatage, calendrier ICS, visibilité des champs.
Tests à ajouter : voir liste V2 §0.2, en particulier permissions et verrouillage de saison.
Migration nécessaire : non.
Déployable indépendamment : oui.
Feature flag léger : non applicable.

## 0.3 Outillage

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe : `npm ci` fonctionne sans erreur (vérifié ce jour, `package-lock.json` synchronisé — l'écart signalé par l'audit ChatGPT n'existe plus dans l'état actuel du dépôt). `next/font/google` (Geist/Geist Mono) a été supprimé le 18/07 (commit `7c8c469`) — le build ne dépend plus du réseau, `globals.css` utilise Arial directement. `public/logo-charenton.png` optimisé de 1,3 Mo à 31 Ko (1024px → 256px, palette PNG). README réel écrit le 18/07 (commit `107df94`) : installation, variables d'environnement, migrations, premier admin, tests, déploiement, procédure de sauvegarde et d'urgence, limites PWA.

Ce qui manque : rien par rapport au périmètre de §0.3.
Fichiers concernés : `package-lock.json`, `src/app/layout.tsx`, `src/app/globals.css`, `public/logo-charenton.png`, `README.md`.
Tables/migrations : aucune.
Risque : aucun.
Effort : fait.
Tests : `npm run build` vert sans variable réseau pour les fonts.
Migration nécessaire : non. Déployable indépendamment : oui (déjà déployé). Feature flag : non.

---

# PHASE 1 — Authentification, sessions et permissions

## 1.1 Propriétaire explicite du club

**Statut : TERMINÉ POUR LE MODÈLE DE GOUVERNANCE ACTIF** (Lot 5 de la roadmap V3, étapes A à D2, déployé en production le 18/07/2026)

**Modèle actif :** Joueur / Coach / Propriétaire — le Propriétaire n'est pas un rôle distinct en base, c'est une surcouche du Coach portée par `team_settings.owner_player_id` (exactement un joueur, toujours `role='coach'`, jamais un rôle métier séparé). `SessionPayload.isOwner` est recalculé à chaque requête par comparaison directe, jamais déduit du prénom, de l'ordre de création ou d'une adresse e-mail.

Le rôle `admin` **n'existe plus comme valeur métier** : 0 ligne `players.role = 'admin'` en base (migrées vers `coach` à l'Étape C), `PlayerRole` réduit à `"player" | "coach"` côté code (Étape D1), et la contrainte SQL `players_role_check` limitée à `CHECK (role = ANY (ARRAY['player'::text, 'coach'::text]))` (Étape D2, migration `20260718100000_remove_legacy_admin_role_constraint.sql`) — `admin` est désormais physiquement rejeté par PostgreSQL, plus seulement absent par convention applicative.

Séquence exécutée (expand → migrate → contract, jamais de migration "big bang", chaque étape testée et déployée indépendamment) :
- **Étape A (expand)** : colonnes additives `team_settings.owner_player_id` (nullable) et `players.pin_length` — `NEW_PIN_LENGTH` découple désormais la longueur de PIN du rôle (plus jamais 4 vs 6 dérivé de `role`).
- **Étape B (code compatible)** : `requireOwner()`/`requireFreshCoach()`/`requireFreshUser()` ; UI relabellée (badge "👑 Propriétaire" uniquement pour le titulaire de `owner_player_id`, "Coach" pour les autres comptes élevés, plus aucune mention visible "Admin"/"Administrateur") ; `/admin/coachs` (gestion promotion/rétrogradation, réservée au propriétaire).
- **Étape C (migrate)** : migration transactionnelle des données réelles — `owner_player_id` renseigné vers Amine Zahid, les 3 comptes `admin` réels (Amine Zahid, Ulysse Monneret, Test Admin) convertis en `coach` avec `session_version` incrémenté (révocation immédiate des anciennes sessions), assertion post-migration annulant toute la transaction en cas d'anomalie.
- **Étape D1 (code final)** : retrait de `admin` de `PlayerRole`, `isElevatedRole()`, gardes de session — 13 sites recensés et corrigés, sans renommage massif.
- **Étape D2 (contract)** : retrait définitif de `admin` de la contrainte SQL, après vérification transactionnelle qu'aucune ligne ne l'utilisait plus.

Noms internes legacy conservés à l'identique, sans impact fonctionnel : `requireAdmin`/`requireUser` (aliases de compatibilité), routes `/admin/*`, variable locale `isAdmin`, composants `AdminSection`/`AdminAvailabilityRow`.

**Transfert de propriété : TOUJOURS DIFFÉRÉ ET DÉSACTIVÉ.** `transfer_ownership()` (RPC PL/pgSQL transactionnelle) et `transferOwnership()` (Server Action) sont implémentés et relus, mais `OWNERSHIP_TRANSFER_ENABLED = false` (`src/lib/data/team-settings.ts`) bloque tout appel réel — aucun environnement Supabase isolé n'est disponible pour un test d'intégration complet (pas de Docker local, pas de projet Supabase de secours, pas d'accès API au niveau organisation). À revisiter uniquement si un tel environnement devient disponible.

Fichiers concernés : `src/lib/auth/current-user.ts`, `src/lib/auth/session.ts`, `src/types/models.ts`, `src/lib/data/team-settings.ts`, `src/lib/data/ownership-actions.ts`, `src/app/admin/coachs/`, `supabase/migrations/20260718060000_*` à `20260718100000_*`.
Rollback documenté séparément (sans jamais modifier une migration déjà appliquée) : `docs/rollbacks/lot-5-owner-coach-migration.md`.
Tests : 79 tests automatisés couvrant `isElevatedRole`, `validateNewPin`, `canView`/`visibility`, `buildOwnershipTransferAuditEntry` ; vérifications fonctionnelles manuelles (Amine reconnu propriétaire, coachs reconnus, joueur refusé, PIN existants fonctionnels, aucune donnée réelle modifiée) à chaque étape.
Migration nécessaire : oui — 5 migrations additives/correctives, toutes appliquées et immuables une fois exécutées.
Déployable indépendamment : oui — chaque étape déployée et vérifiée en production séparément.
Feature flag léger : `OWNERSHIP_TRANSFER_ENABLED` (transfert uniquement, reste à `false`).

## 1.2 Session courte et révocable

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe (posé par le sprint P0, `2ad6a2b`) : `players.session_version integer not null default 1`. JWT réduit à `{playerId, sessionVersion}` (`src/lib/auth/session.ts`). `getCurrentUser()` (`src/lib/auth/current-user.ts`) recharge systématiquement rôle/nom/statut depuis la base et compare `session_version` à chaque requête. `session_version` est incrémenté sur changement de rôle/PIN/statut (`players-actions.ts::updatePlayer`, `setPlayerStatus`), et désormais aussi volontairement via `logoutAllDevices()` (voir 1.4). **Mis à jour (Lot 4 de la roadmap V3, commit `52a27f3`, déployé en production le 18/07/2026) :** durée de session réduite de 180 à 30 jours, synchronisée entre le JWT (`SESSION_DURATION`, `session.ts`) et le cookie (`SESSION_MAX_AGE_SECONDS`, `actions.ts`).

Ce qui manque : `last_pin_change_at`/`last_role_change_at` — délibérément non ajoutées (aucun endroit dans l'UI ne les afficherait aujourd'hui, cohérent avec la note V3 "dates de changement seulement si utilisées"). Pas de renouvellement glissant de session (un compte inactif 30 jours doit se reconnecter) — explicitement exclu du périmètre du Lot 4, à revisiter seulement si ça s'avère gênant en usage réel.

Fichiers concernés : `src/lib/auth/session.ts`, `src/lib/auth/actions.ts`.
Tables/migrations : aucune.
Risque sur données existantes : aucun — vérifié (toute session déjà âgée de plus de 30 jours est coupée au prochain accès, comportement attendu et documenté, pas une perte de données).
Tests déjà présents : aucun automatisé — comportement vérifié manuellement (deux tokens simulant deux navigateurs, cookie à `Max-Age=2592000` exactement après une reconnexion, `sessionVersion` correctement rafraîchi).
Migration nécessaire : non.
Déployable indépendamment : oui — déjà déployé.
Feature flag léger : non nécessaire.

## 1.3 Rate limiting des PIN

**Statut : PARTIELLEMENT IMPLÉMENTÉ / REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE (partiellement)**

Ce qui existe (sprint P0) : `players.failed_pin_attempts integer`, `players.locked_until timestamptz`. La logique dans `src/lib/auth/actions.ts` (`LOCKOUT_MINUTES = 10`) incrémente le compteur à chaque échec et verrouille le compte 10 minutes après 5 échecs — persistant en base, donc pas de "compteur en mémoire" qui se réinitialiserait entre invocations serverless (le vrai risque identifié par l'audit initial est déjà écarté).

Ce qui manque par rapport à la V2 : le compteur est **par joueur**, pas par IP. La V2 §1.3 veut une table `login_attempts` avec hash d'IP, pour empêcher un attaquant de tester des PIN sur *plusieurs* comptes joueurs depuis la même IP sans jamais déclencher le seuil sur un compte donné. Ce n'est pas un doublon inutile : c'est un modèle de menace différent (bruteforce ciblé vs bruteforce distribué sur l'effectif). Pas de purge automatique nécessaire avec l'approche actuelle (pas de table séparée à purger). Pas de migration progressive de PIN joueur 4→6 chiffres.

Fichiers concernés : `src/lib/auth/actions.ts`.
Tables/migrations : nouvelle table `login_attempts` (ip_hash, window, fail_count, blocked_until) si l'on veut couvrir le cas IP.
Dépendances techniques : aucune.
Risque sur données existantes : aucun, additif.
Effort estimé : **M** (nouvelle table + logique + purge périodique).
Tests déjà présents : aucun automatisé (vérifié manuellement : verrouillage après 5 échecs, déverrouillage après expiration — comportement confirmé en live pendant le sprint P0).
Tests à ajouter : blocage au seuil, retour à la normale après expiration de fenêtre, blocage par IP sur plusieurs comptes.
Migration nécessaire : oui si le volet IP est retenu.
Déployable indépendamment : oui.
Feature flag léger : non nécessaire.

**Recommandation de tri (§2.4 de la V2) :** le volet "par joueur" est **Réintroduit** (déjà fait, au-delà même du strict minimum). Le volet "par IP" reste **Toujours différé** — un club amateur avec ~24 comptes n'a pas un profil de risque justifiant l'infrastructure IP dans l'immédiat ; à revisiter si un incident réel survient.

## 1.4 Gestion des sessions

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe : `logout()` (déconnexion de l'appareil courant, préexistant) et **désormais `logoutAllDevices()`** (Lot 4, commit `52a27f3`) — incrémente `session_version` du joueur courant (même mécanisme que le changement de rôle/PIN) et supprime le cookie courant, invalidant immédiatement tous les appareils. Bouton « Déconnecter tous mes appareils » sur `/plus`, à côté du bouton de déconnexion simple (emplacement adapté par rapport à la V2 d'origine, qui suggérait `/profile` — le bouton de déconnexion vit désormais dans `/plus` depuis le lot UI de l'audit).

Ce qui manque : affichage de la date du dernier changement de PIN — dépend de 1.2, volontairement non ajoutée (pas d'endroit pour l'afficher aujourd'hui).
Fichiers concernés : `src/app/plus/page.tsx`, `src/lib/auth/actions.ts`.
Tables/migrations : aucune nouvelle (réutilise `session_version`).
Risque sur données existantes : aucun.
Tests déjà présents : aucun automatisé — vérifié manuellement (deux tokens simulant deux navigateurs, révocation globale confirmée sur les deux, reconnexion normale ensuite fonctionnelle).
Migration nécessaire : non.
Déployable indépendamment : oui — déjà déployé.
Feature flag léger : non nécessaire.

---

# PHASE 2 — Sauvegardes, restauration et gestion des saisons

## 2.1 Registre complet des tables sauvegardées

**Statut : DÉJÀ IMPLÉMENTÉ — Lot 6 terminé et validé en production**

Ce qui existe : `BACKUP_TABLES` (`src/lib/data/backups.ts`) liste 25 tables (`player_goals` inclus). `BACKUP_EXCLUDED_TABLES` documente explicitement les 3 exclusions (`audit_log`, `backups`, `backup_artifacts`) avec leur raison, exposées dans `tables_included`/`tables_excluded`/`exclusion_reasons` sur chaque backup format 2.

Ce qui manque : le test automatisé "compare le registre aux tables applicatives connues" est désormais présent (`backup-coverage.test.ts`, RPC `list_public_base_tables()`, s'exécute en conditions réelles quand des identifiants Supabase sont disponibles, sinon repli automatique) — **mais la duplication de la liste entre `BACKUP_TABLES` (TS) et `export_backup_snapshot()` (SQL) n'a pas été éliminée à la source**, voir `ROADMAP_DEFERRED.md`.
Fichiers concernés : `src/lib/data/backups.ts`, `src/lib/data/backup-coverage.test.ts`, `supabase/migrations/20260718110200_backup_coverage_helper.sql`.
Tests déjà présents : `backup-coverage.test.ts` (2 tests, conditions réelles).
Migration nécessaire : non (déjà livrée).
Déployable indépendamment : oui — déjà déployé.

## 2.2 Snapshot cohérent

**Statut : DÉJÀ IMPLÉMENTÉ — Lot 6 terminé et validé en production**

Ce qui existe désormais : `export_backup_snapshot()` reconstruite en **une seule instruction SQL** (`language sql`, 25 sous-requêtes triées `order by t.id`, migration `20260718110100`) — élimine réellement le risque de cohérence inter-tables (pas seulement en théorie : démontré par un protocole à deux sessions concurrentes, ancienne version reproduit le bug, nouvelle version en est immunisée, voir `roadmap-v3-discussion/lot-06-backups-integrite-retention/`). Le snapshot (format 2) porte désormais `format_version`, date, saison active, auteur/contexte, checksum (`sha256-canonical-json-v1`), version de l'application et du schéma réellement appliqué (`get_latest_applied_migration()`).

Ce qui manque : rien par rapport au périmètre du Lot 6. Le commentaire "REPEATABLE READ" erroné a été retiré (remplacé par une description exacte du mécanisme réel).
Fichiers concernés : `src/lib/data/backups.ts`, `src/lib/data/backup-integrity.ts`, `supabase/migrations/20260718110100_backup_snapshot_secured.sql`.
Migration nécessaire : non (déjà livrée).
Déployable indépendamment : oui — déjà déployé.

## 2.3 Stockage et export

**Statut : PARTIELLEMENT IMPLÉMENTÉ — Lot 6 terminé et validé en production**

Ce qui existe désormais : téléchargement JSON en deux formats documentés (enveloppe versionnée format 2 avec checksum, brut inchangé pour les 4 backups legacy), export séparé `audit_log` (`backup_artifacts`, artefact dédié, checksum propre), avertissement explicite sur les données sensibles avant tout téléchargement complet, bandeau honnête aligné sur la V2 ("Sauvegarde téléchargeable. La restauration complète reste une opération administrateur assistée."), colonne `protected` posée (backups avant opération sensible protégés par défaut, legacy traités comme protégés).

Ce qui manque : purge automatique toujours différée (`protected` et la classification existent, mais aucun cron de purge n'a été construit — voir `ROADMAP_DEFERRED.md`), export expurgé pour les coachs toujours différé.
Fichiers concernés : `src/app/admin/sauvegardes/page.tsx`, `src/lib/data/backups.ts`, `src/lib/data/backups-actions.ts`.
Migration nécessaire : non pour ce qui est livré.
Déployable indépendamment : oui — déjà déployé.

## 2.4 Restauration progressive (Paliers A/B/C)

**Statut Palier A : DÉJÀ IMPLÉMENTÉ — Lot 6 terminé et validé en production**

Ce qui existe : téléchargement JSON (deux formats), comparaison des compteurs par table, bandeau honnête, sauvegarde obligatoire avant clôture/réinitialisation/déverrouillage/migration, inventaire explicite des tables (`tables_included`/`tables_excluded` affichés par backup), validation de format et checksum désormais réelle (5 états d'intégrité : legacy-unverifiable, needs-finalization, unverified, ok, mismatch — voir `roadmap-v3-discussion/lot-06-backups-integrite-retention/`). Procédure de restauration manuelle documentée dans le README (§ "Procédure d'urgence").

Ce qui manque pour un Palier A strictement complet : rien d'identifié.

**Statut Palier B : TOUJOURS DIFFÉRÉ**

Aucune procédure de restauration testée sur environnement isolé n'existe. Nécessite un second projet Supabase (ou une base locale) dédié aux essais — actuellement hors du périmètre de l'infrastructure du projet (un seul projet Supabase `jhoozecgenpxxzcnhcic` existe). C'est un vrai prérequis avant d'envisager le Palier C, cohérent avec la position déjà prise dans `ROADMAP_DEFERRED.md` (Lot 10) : "une réécriture automatisée de ~25 tables liées entre elles est trop risquée sans tests approfondis."

**Statut Palier C : TOUJOURS DIFFÉRÉ**

Aucun des critères d'activation (§2.4 de la V2 : 3 répétitions réussies sur environnement isolé, tests automatisés, etc.) n'est satisfait. Décision déjà actée avec l'utilisateur lors du Lot 10 (`ROADMAP_DEFERRED.md`) de ne pas construire de restauration automatique tant que ces conditions ne sont pas remplies. **Ne pas réintroduire sans un second projet Supabase de test.**

Fichiers concernés (Palier A restant) : `src/lib/data/backups.ts`, `src/app/admin/sauvegardes/page.tsx`.
Tables/migrations : aucune pour A ; un second projet Supabase pour B (pas une migration).
Risque : Palier C présente un risque majeur si précipité (corruption de la saison en cours) — à traiter avec la plus grande prudence, exactement comme le documente déjà la V2.
Effort estimé : Palier A restant **S** ; Palier B **L** (infrastructure + procédure) ; Palier C **XL**.
Migration nécessaire : non pour A ; non pour B (infra séparée) ; oui pour C (RPC transactionnelle de restauration).
Déployable indépendamment : A oui ; B nécessite une infra séparée donc oui aussi (n'affecte pas la prod) ; C non, doit suivre A et B.
Feature flag léger : oui pour C, impératif — un bouton de restauration production ne doit jamais être actif sans un interrupteur explicite.

## 2.5 Assistant de clôture de saison

**Statut : PARTIELLEMENT IMPLÉMENTÉ — Lot 7 terminé et validé en production**

Ce qui existe désormais (Lot 7 de la roadmap V3, commits `45690e1`/`2d7829f`, migration `20260719000000_close_season_rpc.sql`, déployé en production le 19/07/2026) : `startNewSeason()` a été **entièrement remplacée** par une RPC PL/pgSQL transactionnelle unique, `close_season_and_start_new()` (`security definer`, `EXECUTE` réservé à `postgres`/`service_role`, `anon`/`authenticated` refusés) — snapshot pris avant toute mutation, verrou explicite (`SELECT ... FOR UPDATE`) sur la saison source, backup `end_of_season` protégé format 2, clôture+verrouillage de l'ancienne saison, archivage sécurisé des seuls joueurs sélectionnés (jamais le propriétaire, `pin_hash`/`pin_length` jamais touchés, `session_version` incrémenté), exactement une nouvelle saison active créée, cotisation optionnelle limitée aux joueurs actifs restants après archivage, entrée d'audit minimale — tout ou rien (rollback Postgres automatique sur toute erreur, y compris en cours de boucle d'archivage). `closeSeasonAction`/`toggleSeasonLock` (`src/lib/data/seasons-actions.ts`) réservés au propriétaire (`requireOwner()`), la page `/admin/saisons` reste consultable en lecture par tout coach. `getMatchesNeedingReviewForSeason(seasonId)` (obligatoire) complète `getOpenMatchesInActiveSeason` : la page affiche maintenant à la fois les matchs non joués **et** les matchs terminés mais incomplets de la saison active (couvre l'étape 2 du mini-assistant V2, au-delà des seuls matchs non terminés). L'archivage de joueurs est désormais **intégré au flux de soumission du formulaire de clôture** (`CloseSeasonForm.tsx`, cases à cocher, propriétaire exclu de la liste) — ce n'est plus du libre-service séparé. Confirmation forte (nom exact de la saison retapé) revérifiée côté serveur, jamais une confiance client seule. `/season-recap?seasonId=...` permet de consulter le bilan d'une saison passée sans retomber silencieusement sur la saison active. Traitement explicite des cotisations : montant facultatif saisi dans le même formulaire, appliqué uniquement aux joueurs actifs restants sur la nouvelle saison (l'ancienne saison et ses cotisations existantes restent intactes) — **résout le point "aucune notion de report/remise à zéro des `dues` par saison" listé ci-dessous dans une version antérieure de cette entrée**, sans qu'une colonne supplémentaire ait été nécessaire (`dues.season_id` existait déjà). Testé de bout en bout : 30/30 assertions automatisées sur un projet Supabase isolé dédié (rejets, concurrence à deux clôtures simultanées, rollback complet, archivage, cotisations, idempotence, intégrité historique), puis une clôture réelle exécutée manuellement par l'utilisateur via l'interface sur une preview isolée, confirmée conforme sur tous les points.

Ce qui manque toujours par rapport aux 11 étapes détaillées en V2 §2.5 (périmètre volontairement exclu de ce lot, décision produit actée avec l'utilisateur) : clôturer/ignorer les votes ouverts (étape 3 — aucune notion de vote "ouvert/fermé" n'existe, voir Phase 11.7) ; générer le bilan de saison dans le même écran plutôt que via un lien séparé (`/season-recap` reste une page distincte, désormais correctement paramétrable par `seasonId` mais pas fusionnée à l'écran de clôture) ; générer la chronique dans le même flux (la frise de `/memoire` existe déjà, volontairement pas branchée — explicitement écarté du périmètre du Lot 7, aucun système de cycle de vote ni de génération de chronique narrative n'a été ajouté).

Fichiers concernés : `src/app/admin/saisons/page.tsx`, `src/app/admin/saisons/CloseSeasonForm.tsx`, `src/lib/data/seasons-actions.ts`, `src/lib/data/seasons.ts`, `src/lib/data/match-completeness.ts`, `src/app/season-recap/page.tsx`, `supabase/migrations/20260719000000_close_season_rpc.sql`.
Tables/migrations : une migration additive (nouvelle fonction RPC uniquement, aucune table/colonne modifiée) — appliquée au projet partagé le 19/07/2026 après backup protégé préalable (`before_lot_7_season_assistant_migration`, id `64b62a49-691d-42ea-b2a8-b1999cc0eb0e`).
Dépendances techniques : Phase 11.7 (cycle de votes) toujours nécessaire pour l'étape 3 complète.
Risque sur données existantes : résolu — vérifié par le protocole de test isolé (30/30) puis en conditions réelles sur la base partagée (compteurs identiques avant/après migration et avant/après un appel de contrôle volontairement invalide).
Tests déjà présents : 30 assertions automatisées sur projet Supabase isolé (`roadmap-v3-discussion/lot-07-assistant-changement-saison/`) ; aucun test automatisé dans le dépôt lui-même (même philosophie "fonctions pures uniquement" que le reste du projet — la logique transactionnelle vit en SQL, pas en TypeScript testable sans base).
Migration nécessaire : non, déjà livrée et appliquée.
Déployable indépendamment : oui — déployé en production le 19/07/2026, **terminé et validé** (D7-C validé sur preview isolée ; vérifications techniques et de données post-déploiement en production toutes conformes ; les trois rôles — Propriétaire/Coach/Joueur — validés manuellement par l'utilisateur en conditions réelles sur la production).
Feature flag léger : non — la RPC elle-même agit comme verrou (permissions SQL), pas de flag applicatif supplémentaire jugé nécessaire.

**Constat important pour la priorisation :** puisque cette alternative non destructive existe déjà et fonctionne, retirer le bouton de réinitialisation (Phase 0.1) est **moins risqué qu'il n'y paraît** — il ne s'agit pas de bâtir une alternative de zéro, seulement de compléter celle qui existe et de rediriger les admins vers elle.

---

# PHASE 3 — Intégrité des données et transactions

## 3.1 Contraintes SQL

**Statut : DÉJÀ IMPLÉMENTÉ**

**Correction (Lot 3, 18/07/2026) :** cette entrée listait à tort trois contraintes comme manquantes. Une relecture directe de `20260717000000_baseline.sql` (faite avant d'implémenter le Lot 3) a montré qu'elles existent en réalité depuis la toute première migration du projet : `availability` a `UNIQUE (match_id, player_id)` (`availability_match_id_player_id_key`), `votes` a `UNIQUE (match_id, award_id, voter_player_id)` (`votes_match_id_award_id_voter_player_id_key`), et `goals.goal_type` a `CHECK (goal_type IN ('classique','penalty','coup_franc','csc'))` (`goals_goal_type_check`). Cette analyse avait été faite sans relire ligne à ligne la migration baseline — leçon retenue pour la suite : toujours vérifier le schéma réel avant d'affirmer qu'une contrainte manque.

Ce qui existe désormais, au complet : score de match ≥ 0, minute de but/carton entre 0 et 130, `available_seats` ≥ 0, `weight_kg`/`height_cm` plausibles, une seule blessure active par joueur (`injuries_one_active_per_player`, sprint audit) — **et depuis le Lot 3 (commit `c9ed882`, migration `20260718040000_season_active_unique.sql`) : une seule saison active à la fois** (`seasons_one_active`, même modèle d'index unique partiel). Aucun changement de code applicatif n'a été nécessaire — `startNewSeason()` respectait déjà cet invariant.

Ce qui manque : rien de concret par rapport à la liste V2 §3.1. Le point "statut cohérent avec les dates" reste vague et n'a pas de contrainte concrète identifiable à ce stade — pas traité, jugé non prioritaire.

Fichiers concernés : `supabase/migrations/20260718030000_data_constraints.sql`, `supabase/migrations/20260718040000_season_active_unique.sql`.
Tables/migrations : `matches`, `goals`, `cards`, `availability`, `player_measurements`, `injuries`, `votes`, `seasons` — toutes déjà contraintes.
Risque sur données existantes : résolu — vérifié avant migration (1/1 saison active, 0 doublon `availability`/`votes`) et après (tentative de double saison active refusée, insertion normale non bloquée), avec des données temporaires nettoyées.
Tests ajoutés : aucun test automatisé (contrainte SQL pure, pas de logique applicative à isoler) — vérification manuelle en base uniquement, documentée dans le compte rendu du Lot 3.
Migration nécessaire : non, déjà faite.
Déployable indépendamment : oui — déjà déployé.
Feature flag léger : non.

## 3.2 Transactions PostgreSQL (RPC)

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : plusieurs RPC transactionnelles — `export_backup_snapshot()` (Phase 2.2), `confirm_match_roster()` (remplacement de feuille de match, migration `20260718020000_transactional_roster.sql`, atomique : suppression + réinsertion dans un seul corps de fonction PL/pgSQL), `create_sensitive_backup_with_audit_artifact()`/`finalize_sensitive_backup_checksums()` (Lot 6, backup + artefact audit_log garantis ensemble), et **désormais `close_season_and_start_new()` (Lot 7, migration `20260719000000_close_season_rpc.sql`)** — snapshot, verrou `FOR UPDATE` sur la saison source, backup protégé, clôture/verrouillage, archivage sécurisé, nouvelle saison, cotisations et audit minimal dans une seule transaction, remplaçant l'ancienne `startNewSeason()` en 3 opérations séparées sans rollback. `duplicateMatch` (`src/lib/data/matches-actions.ts`) a reçu une mitigation non transactionnelle mais équivalente en pratique : si une étape échoue après la création du match, le match orphelin est supprimé en compensation (`try/catch` + `delete`) — ce n'est pas une vraie transaction Postgres, mais ça atteint le même objectif pratique (jamais de match "fantôme" à moitié dupliqué).

Ce qui manque : RPC transactionnelles pour clôture de blessure + mise à jour des disponibilités (`injuries-actions.ts` reste multi-étapes, idempotent mais pas transactionnel), restauration d'une entrée audit (`audit-actions.ts::restoreChange`, deux étapes : mutation + marquage `restored_at`), fusion de joueurs (fonctionnalité qui n'existe pas encore, voir Phase 8.5), fin de match et création des événements associés (dépend de la Phase 5, pas encore construite).

Fichiers concernés : `src/lib/data/injuries-actions.ts`, `src/lib/data/audit-actions.ts`, `src/lib/data/seasons-actions.ts`.
Tables/migrations : nouvelles fonctions RPC PL/pgSQL pour chacun des cas listés.
Risque sur données existantes : les opérations actuelles sont **idempotentes** (rejouer la même action converge vers le même état), donc le risque réel d'un échec partiel est plus faible qu'un "état corrompu irréversible" — plutôt un état transitoire incohérent récupérable par une nouvelle tentative. À documenter clairement pour ne pas sur-prioriser ce chantier.
Effort estimé : **M** par RPC (suivant le modèle déjà posé par `confirm_match_roster`).
Tests à ajouter : voir liste V2 §3.2 par opération.
Migration nécessaire : oui, une par opération.
Déployable indépendamment : oui, une RPC à la fois.
Feature flag léger : non nécessaire.

## 3.3 Vérification des relations (`.eq("match_id", matchId)`)

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe (posé le 18/07, commit `c87280e`) : `deleteGoal` et `deleteCard` vérifient désormais que l'événement appartient bien au `matchId` fourni (`.eq("id", ...).eq("match_id", matchId)`, avec une erreur explicite si le but/carton n'existe pas pour ce match précis) — comportement vérifié en live (un `goalId` d'un autre match est bien refusé). `deleteEquipmentItem`, `toggleEquipmentBrought`, `claimEquipmentItem` scopés de la même façon par défense en profondeur, même si le matériel n'est pas soumis au verrouillage de saison.

**Mis à jour (Lot 1 de la roadmap V2, commit `ed7043c`) :** `src/lib/data/trash-actions.ts` et `src/lib/data/audit-actions.ts::restoreChange` appliquent désormais `assertMatchSeasonUnlocked()` avant toute restauration/annulation. Le gap précédemment identifié ici (restauration depuis la corbeille et annulation depuis l'historique contournant le verrouillage de saison) est fermé — voir détail en 3.4.

Fichiers concernés : `src/lib/data/goals-actions.ts`, `src/lib/data/cards-actions.ts`, `src/lib/data/equipment-actions.ts`, `src/lib/data/trash-actions.ts`, `src/lib/data/audit-actions.ts`, `src/lib/data/season-lock.ts` (nouveaux helpers `isMatchScopedTable`/`matchIdFromDeletedRowSnapshot`).
Tables/migrations : aucune.
Risque sur données existantes : résolu — le chemin de contournement précédemment démontré par lecture du code n'existe plus (vérifié en live avec des données temporaires, voir 3.4).
Tests ajoutés : `src/lib/data/season-lock.test.ts` (6 tests, fonctions pures) ; comportement de bout en bout vérifié manuellement contre une saison verrouillée temporaire (voir compte rendu du Lot 1).
Migration nécessaire : non.
Déployable indépendamment : oui — déjà déployé.
Feature flag léger : non nécessaire.

## 3.4 Verrouillage complet de saison

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : `assertMatchSeasonUnlocked()` (`src/lib/data/season-lock.ts`) couvre désormais : score/adversaire/détails du match (`updateMatchDetails`), suppression de match (`deleteMatch`), résultat (`updateMatchResult`), feuille de match (`confirmMatchRoster`), composition (`saveLineup`), capitaine (`setCaptain`), buts (`addGoal`/`deleteGoal`), cartons (`addCard`/`deleteCard`), récompenses ponctuelles (`createOneOffAward`), **et désormais (Lot 1, commit `ed7043c`) la restauration depuis la corbeille (match/but/carton) et l'annulation depuis l'historique** pour les entrées concernant `matches`/`goals`/`cards` — le `match_id` réel est toujours résolu côté serveur (recordId direct pour `matches`, lecture fraîche de l'enregistrement ou instantané `old_data` pour un `delete` annulé sur `goals`/`cards`), jamais une valeur transmise par le client. Les entrées d'historique sans lien avec un match (joueurs, cotisations, blessures, saisons) continuent de fonctionner sans vérification, comme attendu.

Ce qui manque encore : gardiens (dépend de la Phase 5.4, la fonctionnalité elle-même n'existe pas encore) ; votes (`castVote` ne vérifie pas le verrouillage de saison — seulement que le match est `completed`, voir Phase 8/11.7) ; correction d'événement au sens large (dépend de la Phase 8.1, pas construite). La feuille de match et la composition ne sont jamais restaurables via la corbeille ou l'historique aujourd'hui (aucun `logChange` n'est appelé pour `match_players`/`match_lineups`) — rien à couvrir de ce côté tant que ce n'est pas le cas.

Fichiers concernés : `src/lib/data/votes-actions.ts` (reste à faire).
Risque sur données existantes : le gap concret précédemment documenté ici est résolu (voir 3.3).
Effort estimé : **S** pour compléter `castVote`.
Tests à ajouter : saison verrouillée → toutes les écritures historiques refusées (actuellement vrai seulement pour un sous-ensemble).
Migration nécessaire : non.
Déployable indépendamment : oui.
Feature flag léger : non.

## 3.5 Matchs à venir par date

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe (posé ce jour, commit `c87280e`) : `getNextMatch()` et `getUpcomingMatches()` (`src/lib/data/matches.ts`) filtrent désormais sur `match_date >= todayDateString()` en plus du statut. Nouvelle fonction `getUnfinalizedPastMatches()` alimentant une section "Matchs passés non finalisés" sur `/matches/review`, réservée aux admins — correspond exactement à la correction demandée par la V2 §3.5.

Ce qui manque : rien par rapport au périmètre de cette sous-fonctionnalité.
Fichiers concernés : `src/lib/data/matches.ts`, `src/app/matches/review/page.tsx`.
Tests déjà présents : vérifié manuellement en live (un match `scheduled` daté dans le passé apparaît bien dans la nouvelle section et disparaît de l'accueil).
Tests à ajouter : test automatisé pur si `getNextMatch`/`getUpcomingMatches` sont un jour extraits en logique testable sans base (aujourd'hui, ce sont des fonctions serveur qui interrogent directement Supabase).
Migration nécessaire : non. Déployable indépendamment : oui, déjà déployé. Feature flag : non.

## 3.6 Joueurs archivés dans l'historique

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe (posé ce jour, commits `c87280e` et `6ec95a7`) : `getAllPlayers()` (au lieu de `getActivePlayers()`) désormais utilisée dans `goals.ts`, `awards.ts`, `cards.ts`, `stats.ts`, `club-memory.ts`, `season-trophies.ts`, `trash.ts`, en plus de `records.ts` (déjà corrigé lors du Lot 11 précédent, avant le sprint d'audit).

Ce qui manque : `stats-advanced.ts::getUpcomingMilestones` utilise volontairement `getActivePlayers()` (comportement correct : un jalon "à venir" n'a pas de sens pour un joueur archivé qui ne jouera plus) — **ne pas confondre avec un oubli**. `monthly-mvp.ts` utilise `getActivePlayers()` pour le mois en cours uniquement — également correct par construction (on ne peut pas élire MVP du mois un joueur qui vient d'être archivé pour un mois passé, cette page n'affiche que le mois courant). Un audit exhaustif de "tous les historiques" (comme le demande explicitement `ROADMAP_DEFERRED.md`, Lot 11 : *"les autres pages qui recherchent un nom de joueur via les joueurs actifs uniquement [...] n'ont pas été auditées une par une"*) n'a pas été refait de façon systématique au-delà des 7 fichiers listés ci-dessus — il reste possible qu'un fichier historique isolé (ex. `season-bingo.ts`, `carpool.ts` pour un ancien match) utilise encore `getActivePlayers()` sans que ce soit un vrai bug (ces deux exemples sont légitimement actifs-only, puisqu'ils concernent des matchs à venir).

Fichiers concernés : voir liste ci-dessus. Grep de contrôle : `getActivePlayers()` est encore utilisé dans `audit.ts`, `availability.ts`, `carpool.ts`, `dues.ts`, `dues-actions.ts`, `equipment.ts`, `monthly-mvp.ts`, `season-bingo.ts`, `season-trophies.ts` (sélecteurs), `stats-advanced.ts`, `stats.ts` (sélecteurs de nouvelles actions) — chacun a été jugé légitime lors du sprint (logistique à venir, sélecteurs de saisie) sauf mention contraire ci-dessus.
Risque sur données existantes : faible — l'effet visible d'un oubli est cosmétique ("Joueur" au lieu du vrai nom), pas une perte de données.
Effort estimé : **S** (audit ciblé résiduel, un ou deux fichiers).
Tests à ajouter : "joueur archivé toujours affiché" — actuellement vérifié manuellement (le joueur "Etienne" gardé exprès lors du remplacement d'effectif sert de cas réel), pas en test automatisé.
Migration nécessaire : non. Déployable indépendamment : oui. Feature flag : non.

---

# Macro-release Lots 8-11 (roadmap V3) — implémentée en preview isolée, non déployée en production

_Branche `macro-8-11-consolidation`, autorisation exceptionnelle de développement groupé (4 sous-lots, gate technique vert après chacun, commit distinct par lot). Rien n'est appliqué au projet Supabase partagé, rien n'est fusionné sur `master`, rien n'est déployé en production tant qu'une validation manuelle explicite n'a pas eu lieu — voir `roadmap-v3-discussion/macro-8-11-consolidation/` pour le détail complet._

**Lot 8 — Transactions critiques restantes : implémenté en preview.** Complète la Phase 3.2 ci-dessus — `upsert_injury_and_sync_availability()` et `restore_audit_entry_transactional()`, deux RPC transactionnelles sur le projet isolé uniquement, remplaçant les séquences multi-étapes non transactionnelles de `injuries-actions.ts`/`audit-actions.ts`. Corrige un écart de sécurité réel découvert pendant l'audit (restauration de fiche joueur qui exposait `pin_hash`/`session_version` à une réécriture silencieuse). 20/20 assertions de test vertes sur le projet isolé.

**Lot 9 — Socle de tests d'intégration : implémenté en preview.** `scripts/isolated-env/` (garde-fou de référence de projet + reset-and-seed idempotent), suite `*.integration.test.ts` séparée (19/19 vertes), CI GitHub Actions (`unit` toujours actif, `integration` conditionné à des secrets dédiés). Tests E2E navigateur délibérément différés (aucun outillage existant, décision documentée).

**Lot 10 — Composants UI transversaux : implémenté en preview.** Six composants nouveaux (`ConfirmDialog`, `EmptyState`, `LoadingSkeleton`, `ErrorState`, `StatusBadge`, `ResponsivePageContainer`, `SectionAccordion`) intégrés dans un sous-ensemble représentatif (saisons, sauvegardes, fiche match, stats). `UndoToast` ajouté par extension du `ToastProvider` existant. `BottomSheet`/`AdminQuickActions` non créés faute d'usage réel identifié.

**Lot 11 — Responsive desktop et accessibilité : implémenté en preview.** `ResponsivePageContainer` appliqué aux 7 pages prioritaires restantes (accueil, matchs, fiche match, stats en `max-w-5xl` ; gestion, coachs, corbeille, santé des données en `max-w-6xl`). `inputMode` ajouté sur les 14 champs numériques du dépôt. Audit exhaustif des cibles tactiles/`aria-describedby`/ordre de tabulation non repris dans ce lot — décision de périmètre assumée, documentée dans le commit.

**Preview consolidée isolée** vérifiée : pointe exclusivement vers `cimbymuifzooxrnenznd` (jamais le projet partagé), dataset de démonstration propre, aucune variable Preview/Production générale modifiée.

---

# PHASE 4 — Socle UI/UX et navigation

## 4.1 Navigation à cinq onglets

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe (posé ce jour, commit `7c8c469`) : 5ᵉ onglet "Plus" (`src/components/layout/BottomNav.tsx`, page `src/app/plus/page.tsx`) regroupant Trophées, Records, Mémoire, Cotisations, Administration (si rôle élevé), Aide, Profil — exactement le modèle V2 §4.1, à deux exceptions près : "Boîte à idées" et "Nouveautés" sont absents car les fonctionnalités sous-jacentes (Phase 11.1, 11.4) n'existent pas encore.
Fichiers concernés : `src/components/layout/BottomNav.tsx`, `src/app/plus/page.tsx`.
Tests déjà présents : vérifié manuellement (onglet actif sur `aria-current`, admin voit "Administration", joueur non).
Migration nécessaire : non. Déployable indépendamment : oui, déjà déployé.

## 4.2 Header simplifié

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe : `src/components/layout/AppShell.tsx` — le header ne contient plus que logo/titre + un avatar (initiale du joueur) renvoyant vers `/plus`, qui contient lui-même Aide/Profil/Déconnexion. Correspond à la recommandation V2 §4.2, avec une implémentation légèrement différente (renvoi vers `/plus` plutôt qu'un menu déroulant local) — un choix délibéré pour réutiliser l'onglet "Plus" plutôt que construire un second mécanisme de menu.
Migration nécessaire : non. Déployable indépendamment : oui, déjà déployé.

## 4.3 Responsive desktop

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe (posé ce jour) : les 39 pages utilisant `max-w-md` sont passées à `max-w-md lg:max-w-2xl` (élargissement modéré sur grand écran).

Ce qui manque : la V2 §4.3 vise `max-w-5xl`/`max-w-6xl` **combiné** à une refonte de mise en page (accueil deux colonnes, fiche match avec panneau latéral, grilles de stats, tableaux admin plus larges). Le choix fait ce jour (`max-w-2xl`) est délibérément plus conservateur : élargir le conteneur jusqu'à 5xl/6xl sans réorganiser le contenu interne (toujours en une seule colonne verticale de cartes) aurait laissé de grands espaces vides disgracieux sur desktop plutôt que d'améliorer l'usage de l'espace. La demande complète de la V2 (vraie mise en page multi-colonnes) reste à faire.
Fichiers concernés : les 39 fichiers `page.tsx` déjà touchés, plus une refonte de mise en page pour `src/app/page.tsx` (accueil), `src/app/matches/[id]/page.tsx` (fiche match), `src/app/stats/page.tsx` (grille), `src/app/admin/**` (tableaux).
Tables/migrations : aucune.
Risque sur données existantes : aucun (UI uniquement).
Effort estimé : **L** (refonte de mise en page multi-colonnes sur les pages clés) — nettement plus gros que le premier passage déjà fait.
Tests à ajouter : test visuel à 1440px sur accueil, fiche match, stats.
Migration nécessaire : non. Déployable indépendamment : oui, page par page. Feature flag : non nécessaire.

## 4.4 Safe areas et PWA

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe (posé ce jour) : `env(safe-area-inset-top)` sur le header (`AppShell.tsx`), `env(safe-area-inset-bottom)` sur la bottom nav et sur le padding bas du contenu principal.
Ce qui manque : test réel sur iPhone physique en mode standalone (vérifié seulement par lecture de code + build, pas par un test sur device — cohérent avec l'absence d'outillage de test visuel dans ce projet).
Migration nécessaire : non. Déployable indépendamment : oui, déjà déployé.

## 4.5 Composants transversaux

**Statut : À IMPLÉMENTER**

Ce qui existe : `ToastProvider`/`useToast` (confirmations discrètes, posé lors du Lot "Vestiaire"), `Button`, `Card`, `Field`, `InlineChoicePanel`, `PlayerSelect`, `StatusPicker`, `WhatsAppShareButton` (`src/components/ui/`). Aucun `loading.tsx`/`error.tsx` Next.js n'existe dans `src/app` (0 fichier) — pas de skeleton de chargement ni de frontière d'erreur au niveau route.

Ce qui manque : `BottomSheet`, `ConfirmDialog` (les confirmations actuelles utilisent des patterns ad hoc — champ de saisie exacte pour la réinitialisation, boutons directs sans confirmation pour le reste, aucun `window.confirm()` utilisé nulle part dans le code), `UndoToast` (le `ToastProvider` actuel affiche un message, pas un bouton d'action "Annuler"), `EmptyState`, `LoadingSkeleton`, `ErrorState`, `StatusBadge`, `ResponsivePageContainer`, `AdminQuickActions`, `SectionAccordion`.
Fichiers concernés : nouveaux composants dans `src/components/ui/`.
Tables/migrations : aucune.
Risque sur données existantes : aucun.
Effort estimé : **M** pour le socle initial (3-4 composants les plus utiles : `EmptyState`, `ConfirmDialog`, `LoadingSkeleton`, `ErrorState` via `error.tsx`), **L** pour l'ensemble complet.
Tests à ajouter : non applicable (composants UI).
Migration nécessaire : non. Déployable indépendamment : oui, composant par composant. Feature flag : non.

## 4.6 Accessibilité

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe (posé ce jour) : `aria-current="page"` sur la navigation, nom accessible (`aria-label="Navigation principale"`), focus-visible global (règle CSS `a:focus-visible, button:focus-visible, ...` dans `globals.css`), annonce du nombre de chiffres du PIN saisis pour les lecteurs d'écran (`role="status"` + texte `sr-only`).

Ce qui manque : cible tactile 44px minimum non vérifiée systématiquement (probable sur la plupart des boutons existants — le pavé PIN fait 64px — mais pas audité un par un) ; labels explicites et erreurs associées aux champs — pas systématique, dépend de chaque formulaire ; icône + texte pour chaque statut — partiellement vrai (StatusPicker a des libellés) ; clavier numérique sur PIN et scores — le pavé PIN est déjà un composant dédié en boutons (pas de clavier natif à forcer), mais les champs de score utilisent probablement `type="number"` standard sans vérification de `inputMode="numeric"`.
Fichiers concernés : formulaires dispersés dans `src/app/**`.
Risque : aucun sur les données.
Effort estimé : **M** (audit + corrections ciblées, pas une refonte).
Tests à ajouter : aucun test automatisé d'accessibilité (type axe-core) n'existe dans le projet.
Migration nécessaire : non. Déployable indépendamment : oui, par page. Feature flag : non.

## 4.7 États de chargement et réseau

**Statut : TOUJOURS DIFFÉRÉ**

Ce qui existe : aucun état `Enregistrement…`/`Enregistré`/`Échec` générique — les Server Actions actuelles s'appuient sur le rendu React après revalidation (`revalidatePath`), sans état intermédiaire visible. Pas de bouton "Réessayer" générique.
Dépend directement de 4.5 (composants transversaux). Pas de valeur à traiter isolément.
Effort estimé : **M**, dépendant de 4.5.
Migration nécessaire : non.

---

# PHASE 5 — Cycle de vie du match et mode « Match en cours »

**Statut global : À IMPLÉMENTER (phase entière, aucune sous-partie construite)**

Ce qui existe aujourd'hui : `matches.status` est un simple `text` avec au minimum les valeurs `scheduled`/`completed` observées en usage (pas de `draft`/`live`/`cancelled`/`postponed` distincts dans le code applicatif actuel — à vérifier précisément avant d'étendre, aucune contrainte `check` ne limite les valeurs possibles aujourd'hui). Aucune colonne `started_at`, `ended_at`, `completion_status`, `validated_at`, `validated_by_player_id`. Pas de route `/matches/[id]/live`. La saisie après-match ("résultat express", §5.7) existe déjà et fonctionne bien — c'est le socle sur lequel toute la Phase 5 doit se greffer sans le casser.

`match_players.goalkeeper` (booléen) et `availability.goalkeeper_available` existent en base **depuis le début du projet** mais ne sont alimentés par aucune interface — confirmé par une recherche exhaustive dans le code (`grep goalkeeper` ne retourne que les définitions de type). `getMatchReadiness()` (`src/lib/data/match-readiness.ts`, fonctionnalité existante non documentée dans la V2, voir section dédiée plus bas) détecte déjà "aucun gardien confirmé" mais **via le poste principal du joueur** (`primary_position === "Gardien"`), pas via une désignation par match — un contournement fonctionnel qui masque en partie le manque, mais ne le comble pas (un joueur qui dépanne au poste de gardien un match donné sans avoir "Gardien" comme poste principal ne serait pas détecté).

Fichiers concernés (nouveaux) : `src/app/matches/[id]/live/page.tsx`, `src/lib/data/matches-live-actions.ts` (nouveau), extension de `roster-actions.ts` pour le gardien.
Tables/migrations : `matches` (colonnes de cycle de vie), potentiellement un enum contrôlé pour `completion_status`.
Dépendances techniques : Phase 3 (transactions, verrouillage) et Phase 4 (composants, notamment pour l'écran live) doivent être solides avant d'attaquer cette phase — cohérent avec l'ordre de la V2 elle-même (Phases 3-4 → 5).
Risque sur données existantes : **élevé si mal fait** — c'est la phase la plus délicate de toute la roadmap (concurrence, idempotence, ne jamais perdre un but saisi en direct). Nécessite la stratégie de concurrence décrite en §5.5 dès la première itération, pas en rattrapage.
Effort estimé : **XL** pour la phase complète ; **L** pour un premier sous-lot minimal (démarrer/terminer un match + saisie de gardien, sans écran live temps réel).
Tests à ajouter : voir liste exhaustive V2 §5, en particulier l'idempotence des événements et le double-clic concurrent.
Migration nécessaire : oui, plusieurs.
Déployable indépendamment : le sous-lot "gardien par match" (5.4) est isolable et à faible risque — bon candidat de premier sous-lot, indépendant du reste de la phase. Le mode live complet (5.2-5.5) ne l'est pas — c'est une refonte du cœur de la saisie de match.
Feature flag léger : **fortement recommandé** — activer le mode live pour une poignée de matchs test avant un déploiement large, sans toucher au flux "résultat express" existant qui doit continuer à fonctionner en parallèle indéfiniment (§5.7 l'exige explicitement).

---

# PHASE 6 — Disponibilité avancée, restrictions et rotation

## 6.1 Consolider les blessures existantes

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe : le système de blessures (`injuries`, `injuries-actions.ts`) couvre déjà l'essentiel — statut actif unique par joueur (contrainte SQL posée ce jour, `injuries_one_active_per_player`), couverture automatique des matchs à venir jusqu'à la date de retour estimée (`applyInjuryCoverage`/`syncActiveInjuriesToUpcomingMatches`), exclusion des relances (comportement déjà en place), et surtout les quatre choix exacts demandés par la V2 §6.1 quand un joueur blessé répond "Présent" : `resolveInjuredPresence()` propose "Je suis rétabli" / "Je joue malgré la blessure", et `adminOverrideInjuredPresence()` couvre le cas admin ("uniquement ce match" / "clôturer et présent"). Il manque juste le libellé exact "La date était incorrecte" comme option dédiée (aujourd'hui, ce cas se traite via "Je suis rétabli" puis une nouvelle déclaration, ou via `updateInjuryReturnDate`) — une nuance de copy, pas un manque fonctionnel.
Fichiers concernés : `src/lib/data/injuries-actions.ts`.
Migration nécessaire : non. Déployable indépendamment : oui, déjà déployé.

## 6.2 Restrictions temporaires

**Statut : À IMPLÉMENTER**

Aucune table `player_restrictions` n'existe. Aucune notion de "pas de gardien"/"pas de défense"/"reprise progressive" distincte d'une blessure active binaire.
Tables/migrations : nouvelle table `player_restrictions` (schéma déjà détaillé dans la V2 §6.2, réutilisable tel quel).
Dépendances techniques : Phase 5.4 (gardien par match) pour que `no_goalkeeper` ait un effet visible concret.
Risque sur données existantes : aucun (nouvelle table).
Effort estimé : **M**.
Migration nécessaire : oui, additive.
Déployable indépendamment : oui.
Feature flag léger : non nécessaire.

## 6.3 Historique de disponibilité

**Statut : À IMPLÉMENTER**

Aucune vue consolidée "période indisponible / retour prévu / retour réel / retour progressif / présence malgré blessure" n'existe — les données existent déjà éparpillées (`injuries.started_at`/`estimated_return_date`/`actual_return_date`, `availability.status`), mais rien ne les assemble en historique lisible par joueur.
Effort estimé : **S-M** (vue calculée à partir des données déjà existantes — aucune nouvelle table nécessaire, dans l'esprit "calcul automatique" §3.2 de la V2).
Migration nécessaire : non.
Déployable indépendamment : oui.

## 6.4 Date limite de réponse

**Statut : À IMPLÉMENTER**

Aucune colonne `response_deadline` sur `matches`, ni `first_responded_at`/`last_changed_at`/`late_response` sur `availability`.
Tables/migrations : les trois colonnes décrites en V2 §6.4.
Risque sur données existantes : aucun, additif et nullable.
Effort estimé : **M**.
Migration nécessaire : oui, additive.
Déployable indépendamment : oui.

## 6.5 Rotation équitable

**Statut : À IMPLÉMENTER**

Aucune fonction de suggestion de rotation n'existe. Dépend de 6.4 (deadlines) pour le signal "disponible mais non retenu" et de l'historique de présence déjà disponible (`match_players`).
Effort estimé : **M**.
Migration nécessaire : non (calcul à la volée).
Dépendances techniques : bénéficie de 6.4 sans en dépendre strictement.

## 6.6 Fiabilité organisationnelle positive

**Statut : À IMPLÉMENTER**

Aucun signal "répond généralement à temps" n'est calculé. Dépend de 6.4.
Effort estimé : **S** une fois 6.4 posé.

## 6.7 Statistiques admin de ponctualité

**Statut : À IMPLÉMENTER**

Dépend entièrement de 6.4.
Effort estimé : **S** une fois 6.4 posé.

---

# PHASE 7 — Logistique enrichie et checklist personnelle

## 7.1 Registre des terrains

**Statut : REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE (temporairement) / À IMPLÉMENTER (si le besoin réapparaît)**

Ce qui existe : `matches.address`, `matches.location`, `matches.maps_url` directement sur chaque match — pas de table `venues` réutilisable. Décision déjà actée dans `ROADMAP_DEFERRED.md` (Lot 2). La V2 §7.1 la réintroduit explicitement dans son propre registre (§4, "Éléments réintroduits").
Tables/migrations : nouvelle table `venues` + colonne `venue_id` sur `matches`, en gardant les champs actuels pendant la transition (cohérent avec la règle §1.5 de la V2 : migration additive, jamais de rupture immédiate).
Risque sur données existantes : faible si additif — mais nécessite un choix de migration de données (créer un `venue` à partir de chaque combinaison adresse/lieu déjà utilisée, avec dédoublonnage manuel probable).
Effort estimé : **M**.
Migration nécessaire : oui, additive.
Déployable indépendamment : oui.

## 7.2 Covoiturage enrichi

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : conducteurs/places déclarées, passagers en attente (`carpool.ts`, table `availability`). **Alerte de déficit de places déjà calculée** — via `getMatchReadiness()` (`carpoolSufficient`, `!carpoolSufficient → "Pas assez de places en covoiturage"`), une fonctionnalité qui existe mais n'est pas explicitement listée dans la V2 (voir section "fonctionnalités absentes de la roadmap").
Ce qui manque : assignation explicite passager↔conducteur (aujourd'hui, deux listes séparées, pas de lien entre "qui monte avec qui"), point/heure de départ, contact via lien dédié (pas de lien "contacter le conducteur" cliquable), ne jamais recopier automatiquement sur le match suivant (déjà vrai aujourd'hui — `availability` est toujours par match, donc rien n'est recopié — c'est un non-problème avec l'architecture actuelle, pas un manque).
Effort estimé : **M** (assignation passager↔conducteur, lien de contact).
Migration nécessaire : possiblement une table de liaison `carpool_assignments`, ou un champ `assigned_driver_id` sur les lignes `availability` des passagers.
Déployable indépendamment : oui.

## 7.3 Matériel et rotation

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : `match_equipment_items` avec assignation et statut "apporté" (`brought` boolean). `getMatchReadiness()` détecte déjà les éléments non assignés (`unassignedEquipment`).
Ce qui manque : statuts `assigné`/`confirmé`/`apporté`/`oublié` (aujourd'hui, un seul booléen `brought`, pas de distinction confirmé/oublié) ; bouton "Reprendre le matériel du match précédent" (déjà noté comme écarté dans `ROADMAP_DEFERRED.md`, Lot 2, réintroduit par la V2 §4/§7.3) ; suggestion de rotation du capitanat (également déjà noté comme écarté, réintroduit par la V2).
Fichiers concernés : `src/lib/data/equipment.ts`, `src/lib/data/equipment-actions.ts`.
Tables/migrations : `match_equipment_items.status` (remplacer/étendre le booléen `brought` par un texte à choix contraint) — **attention** : changer un booléen existant en texte est un changement de type sur une colonne existante, à traiter avec la règle §1.5 de la V2 (ajouter la nouvelle colonne nullable, migrer les données, seulement ensuite retirer l'ancienne).
Risque sur données existantes : moyen — migration de type de colonne à faire avec précaution (pas juste additive).
Effort estimé : **M**.
Migration nécessaire : oui.
Déployable indépendamment : oui.

## 7.4 Checklist personnelle

**Statut : À IMPLÉMENTER**

Aucune des trois tables (`checklist_templates`, `player_checklist_preferences`, `match_checklist_items`) n'existe.
Effort estimé : **M**.
Migration nécessaire : oui, 3 nouvelles tables.
Déployable indépendamment : oui — fonctionnalité entièrement additive et privée par joueur, aucun risque sur l'existant.

## 7.5 Mode jour de match

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : l'accueil (`src/app/page.tsx`) affiche déjà RDV, coup d'envoi, itinéraire, nombre de présents — la V2 elle-même liste "mode jour de match déjà amorcé" comme point fort dans l'audit externe repris en §2.2. `getMatchReadiness()` (fonctionnalité existante non documentée dans la V2) calcule déjà des alertes utiles (gardien manquant, effectif insuffisant, covoiturage insuffisant, matériel non assigné) mais **n'est actuellement affiché nulle part dans l'interface** — la fonction existe et est testée par la lecture du code, mais aucune page ne l'appelle (vérifié par recherche : aucun import de `getMatchReadiness` dans `src/app`).

Ce qui manque : brancher `getMatchReadiness()` sur l'accueil ou la fiche match ; capitaine et gardien affichés (le capitaine l'est déjà via `matches.captain_player_id`, le gardien dépend de la Phase 5.4) ; checklist (dépend de 7.4).
Fichiers concernés : `src/app/page.tsx`, `src/lib/data/match-readiness.ts`.
Effort estimé : **S** pour brancher l'existant (`getMatchReadiness` déjà écrit, juste pas affiché), **M** pour le reste dépendant d'autres phases.
Migration nécessaire : non pour la partie branchable immédiatement.
Déployable indépendamment : oui — **candidat de lot rapide et à faible risque**, une fonction déjà écrite et non branchée est une opportunité peu coûteuse.

## 7.6 Modèles génériques de matchs

**Statut : REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE (temporairement) / À IMPLÉMENTER (si le besoin réapparaît)**

Ce qui existe : `duplicateMatch()` ("Rejouer contre cet adversaire") — couvre le cas le plus fréquent mais suppose toujours un adversaire précis, pas un modèle générique ("vendredi soir à Charenton"). Décision déjà actée dans `ROADMAP_DEFERRED.md` (Lot 5), réintroduite explicitement par la V2 §4.
Tables/migrations : nouvelle table `match_templates`.
Risque sur données existantes : aucun, additif.
Effort estimé : **M**.
Migration nécessaire : oui.
Déployable indépendamment : oui, en complément de `duplicateMatch` (pas un remplacement — les deux mécanismes coexistent, comme le précise la V2 elle-même : "Le bouton existant [...] est conservé, mais complété").

---

# PHASE 8 — Corrections, validation collective et annulation rapide

## 8.1 Demandes de correction

**Statut : À IMPLÉMENTER**

Aucune table `correction_requests`. Aujourd'hui, seul un admin peut corriger directement (pas de file d'attente joueur → admin) — comportement déjà documenté comme un choix temporaire dans `ROADMAP_DEFERRED.md` (Lot 4), réintroduit par la V2.
Tables/migrations : nouvelle table `correction_requests`.
Dépendances techniques : bénéficie de Phase 3.2 (RPC transactionnelle pour l'application de la correction acceptée).
Risque sur données existantes : aucun tant que l'acceptation applique exactement le format déjà validé par les Server Actions existantes (ne pas dupliquer la logique de validation).
Effort estimé : **L**.
Migration nécessaire : oui.
Déployable indépendamment : oui.
Feature flag léger : non nécessaire, mais utile pour un déploiement progressif (activer d'abord pour le score, puis étendre aux buteurs/cartons).

## 8.2 Confirmation collective

**Statut : À IMPLÉMENTER**

Aucune table `match_confirmations`. Aucune notion de `completion_status` (dépend de la Phase 5, qui introduit ce concept).
Effort estimé : **M**, après la Phase 5.
Migration nécessaire : oui.
Dépendances techniques : Phase 5 (modèle de statut de match).

## 8.3 Page admin « À valider »

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : `/matches/review` regroupe déjà matchs incomplets (`getMatchesNeedingReview`) et, depuis ce jour, matchs passés non finalisés (`getUnfinalizedPastMatches`, Phase 3.5).
Ce qui manque : corrections (dépend de 8.1), votes à clôturer (dépend de 11.7), invités à fusionner (dépend de 8.5), sauvegardes anciennes (donnée déjà disponible via `getLastBackupAge()`, juste pas affichée sur cette page).
Effort estimé : **S** pour intégrer l'alerte de sauvegarde ancienne (donnée déjà calculée) ; **M+** pour le reste, au fur et à mesure que les fonctionnalités dépendantes existent.
Migration nécessaire : non pour l'existant. Déployable indépendamment : oui, incrémentalement.

## 8.4 Annulation rapide

**Statut : À IMPLÉMENTER**

Aucun mécanisme "toast avec bouton Annuler" — le `ToastProvider` actuel affiche un message sans action. Les suppressions de buts/cartons/matchs sont déjà des **suppressions douces** (`deleted_at`), récupérables depuis `/admin/corbeille`, ce qui constitue un filet de sécurité différent (permanent, pas limité à 10-15 secondes) mais pas l'expérience "Annuler" immédiate demandée par la V2.
Effort estimé : **M** (étendre `ToastProvider` avec une action, brancher sur les suppressions existantes qui ont déjà toute la donnée nécessaire via la corbeille).
Migration nécessaire : non.
Déployable indépendamment : oui.

## 8.5 Joueurs invités et fusion contrôlée

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : `players.is_guest boolean` **existe déjà en base** mais n'est utilisé nulle part dans le code applicatif (même situation que `match_players.goalkeeper` — une colonne posée à l'avance, jamais branchée). Aucune fonctionnalité de fusion de joueurs n'existe (cohérent avec `ROADMAP_DEFERRED.md`, Lot 10 : "aucune fonctionnalité de fusion de joueurs invités n'existe encore").
Ce qui manque : tout le cycle de vie (création d'un invité, conversion, fusion, aperçu des données transférées, sauvegarde obligatoire avant fusion, transaction unique).
Fichiers concernés : `src/lib/data/players-actions.ts`, nouvelle RPC de fusion.
Tables/migrations : `is_guest` déjà présent, pas de nouvelle colonne nécessaire côté `players` ; la fusion elle-même nécessite une RPC transactionnelle (Phase 3.2).
Risque sur données existantes : **élevé si mal fait** — une fusion touche buts, passes, présences, cartons, récompenses d'un coup. Doit suivre scrupuleusement la règle §1.3 de la V2 (sauvegarde, aperçu, confirmation, trace, retour arrière documenté).
Effort estimé : **L**.
Migration nécessaire : non pour la colonne (déjà là), oui pour la RPC de fusion.
Déployable indépendamment : oui, mais à ne pas précipiter vu le risque.
Feature flag léger : recommandé.

---

# PHASE 9 — Liens directs, découvrabilité et accès public

## 9.1 Deep links authentifiés

**Statut : À IMPLÉMENTER**

Aucun paramètre `next` géré par le flux de connexion (`src/lib/auth/actions.ts`, `src/app/login/page.tsx`) — vérifié par recherche, absent. Les partages WhatsApp existants (`WhatsAppShareButton`) pointent vers des pages précises (ex. `/matches/[id]`), donc une partie du chemin existe déjà (lien direct vers la bonne page), mais sans le mécanisme "non connecté → login avec `next` → retour à l'action" — un joueur non connecté cliquant un lien partagé atterrit simplement sur `/login` sans redirection de retour.
Effort estimé : **M**.
Risque sur données existantes : aucun — attention sécurité à la validation du paramètre `next` (éviter une redirection ouverte, la V2 le souligne explicitement en §9.1 et en critère d'acceptation).
Migration nécessaire : non.
Déployable indépendamment : oui.

## 9.2 Connexion améliorée

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe (posé ce jour, commit `7c8c469`) : "Continuer en tant que..." mémorisé en `localStorage`, bouton "Ce n'est pas moi" (déjà présent avant ce sprint), recherche de joueur au-delà de 12 joueurs (seuil volontairement plus bas que les "20 joueurs" mentionnés par la V2, l'effectif réel étant de 24), avatars/initiales déjà présents.
Ce qui manque : "joueurs récents" au pluriel (seul le dernier joueur connecté est mémorisé, pas un historique des N derniers) — nuance mineure par rapport à la V2.
Effort estimé : **S** si l'historique multi-joueurs est jugé utile.
Migration nécessaire : non. Déployable indépendamment : oui, déjà déployé.

## 9.3 Service générique de liens publics temporaires

**Statut : À IMPLÉMENTER**

Confirmé par lecture du schéma : le triplet token/`expires_at`/`revoked_at` n'existe que sur `reinforcement_calls`. `players.calendar_token` et `players.public_token` sont de simples chaînes régénérables (Phase 9.5, déjà fait), sans expiration ni révocation propres — la régénération sert de révocation de fait (l'ancien lien cesse de fonctionner), mais il n'existe pas de mécanisme "désactiver sans regénérer" ni de date d'expiration automatique.
Ce qui manque : extraction en couche commune (`public_links` ou équivalent) réutilisable par appel à renfort, profil public, future fiche match publique, composition, bilan de saison.
Tables/migrations : nouvelle table générique, ou généralisation du pattern déjà éprouvé par `reinforcement_calls`.
Risque sur données existantes : moyen — migrer `reinforcement_calls` vers un système générique après coup demande de préserver les liens déjà partagés (ne pas invalider silencieusement des QR codes ou liens déjà en circulation).
Effort estimé : **L** (extraction + migration des usages existants).
Migration nécessaire : oui.
Déployable indépendamment : le nouveau système peut être introduit pour de *nouveaux* cas d'usage (fiche match publique, etc.) sans toucher immédiatement à `reinforcement_calls`, réduisant le risque.

## 9.4 QR codes

**Statut : À IMPLÉMENTER**

Aucune génération de QR code dans le code actuel (aucune dépendance QR dans `package.json`, vérifié). Dépend de 9.3 pour des liens révocables plutôt que des tokens ad hoc par fonctionnalité.
Effort estimé : **S-M** (génération QR à la volée à partir d'une URL, bibliothèque légère ou service côté client via `<canvas>`).
Migration nécessaire : non.
Déployable indépendamment : oui, une fois 9.3 posé (ou directement sur les liens actuels, en acceptant de refaire le QR si le token est régénéré plus tard).

## 9.5 Régénération des tokens

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe (posé ce jour, commit `5a92a59`) : `regenerateCalendarToken()` et `regeneratePublicToken()` (`src/lib/data/players-actions.ts`), avec boutons "Régénérer" sur `/profile`.
Ce qui manque : "révoquer un lien" comme action distincte de "régénérer" (aujourd'hui, seule la régénération existe — un admin ne peut pas désactiver un lien sans en générer un nouveau) ; date de dernière génération non affichée à l'utilisateur (la donnée n'est même pas stockée — `calendar_token`/`public_token` sont de simples chaînes sans horodatage de dernière régénération).
Effort estimé : **S** (ajouter un horodatage, déjà presque là).
Migration nécessaire : oui, additive (`calendar_token_regenerated_at`, `public_token_regenerated_at` ou équivalent), si retenu.
Déployable indépendamment : oui.

---

# PHASE 10 — Statistiques et résumés intelligents

## 10.1 Architecture de calcul

**Statut : DÉJÀ IMPLÉMENTÉ**

Ce qui existe : tout `src/lib/data/stats*.ts` calcule déjà à la volée depuis les événements bruts, sans stockage de totaux dupliqués — exactement le principe demandé par la V2 §10.1. Pas de vues SQL dédiées pour les agrégats lourds (tout se fait côté application), ce qui est un choix cohérent avec la taille actuelle des données (quelques dizaines de matchs, pas un besoin de performance qui justifierait des vues matérialisées).
Migration nécessaire : non.

## 10.2 Duo le plus décisif

**Statut : À IMPLÉMENTER**

Aucune fonction ne calcule les combinaisons passeur→buteur. Toutes les données nécessaires existent déjà (`goals.scorer_player_id`/`assist_player_id`) — calcul pur additif, aucune nouvelle donnée à collecter.
Effort estimé : **S**.
Migration nécessaire : non.
Tests à ajouter : sens correct (passeur → buteur, pas l'inverse), CSC exclus, but sans passe exclu.

## 10.3 Résumé personnel mensuel

**Statut : À IMPLÉMENTER**

Aucune fonction de résumé mensuel par joueur. Toutes les données sous-jacentes existent déjà.
Effort estimé : **M** (calcul + carte partageable, en réutilisant le pattern déjà éprouvé des cartes existantes).
Migration nécessaire : non.

## 10.4 Records imminents

**Statut : À IMPLÉMENTER**

Non construit — `getUpcomingMilestones()` (`stats-advanced.ts`) couvre déjà une partie proche de ce besoin (paliers ronds de buts/présences), mais pas spécifiquement "record du club à un but/match/passe près" ni "duo proche d'un record".
Effort estimé : **S-M**, en étendant `getUpcomingMilestones` plutôt qu'en repartant de zéro.
Migration nécessaire : non.

## 10.5 Statistiques gardiens

**Statut : TOUJOURS DIFFÉRÉ (dépendance bloquante)**

Dépend intégralement de la Phase 5.4 (aucune donnée fiable de "qui a gardé, sur quelle période" n'existe aujourd'hui — `match_players.goalkeeper` n'est jamais renseigné). Ne peut pas être commencé avant.
Effort estimé : **M**, une fois 5.4 livré.
Migration nécessaire : non (les colonnes existent déjà, juste non alimentées).

## 10.6 Filtres

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : `/stats/tendances` affiche déjà des répartitions fixes (domicile/extérieur, par jour, par mois) — décision déjà actée dans `ROADMAP_DEFERRED.md` (Lot 7) de ne pas construire un système de filtre générique encodable dans l'URL.
Ce qui manque : le filtre générique lui-même (saison/mois/5 derniers matchs/domicile-extérieur/jour, partagé et dans l'URL) — la V2 le redemande explicitement, sans le lister dans son propre registre "réintroduit" (§4/§5), ce qui suggère qu'il reste d'intérêt secondaire tant que les répartitions fixes couvrent le besoin réel observé.
Effort estimé : **M**.
Migration nécessaire : non.

## 10.7 Statistiques organisationnelles

**Statut : TOUJOURS DIFFÉRÉ (dépendance bloquante)**

Dépend de Phase 6.4-6.7 (deadlines et ponctualité). Rien à construire avant.

---

# PHASE 11 — Engagement, mémoire et communication

## 11.1 Boîte à idées

**Statut : À IMPLÉMENTER**

Aucune table `ideas`. Fonctionnalité entièrement nouvelle.
Effort estimé : **M**.
Migration nécessaire : oui (`ideas`, éventuellement `idea_votes`/`idea_comments`).
Risque sur données existantes : aucun.
Déployable indépendamment : oui.

## 11.2 Objectifs collectifs secrets

**Statut : REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE (partiellement) — se chevauche avec une fonctionnalité déjà existante**

Ce qui existe : `season-bingo.ts` (grille de 5 cases sur 6 prévues, la case gardien manque — dépend de la Phase 5.4, déjà noté dans `ROADMAP_DEFERRED.md` Lot 9) et `collective-challenges.ts` (4 défis fixes calculés à la volée) couvrent déjà une bonne partie de l'esprit "objectif collectif" — mais sans notion de "secret avec indice et date de déblocage" ni de table `secret_objectives` dédiée. Voir aussi Phase 11.8 (même chevauchement).
Ce qui manque : la mécanique de "déblocage" et d'indice facultatif, spécifiquement.
Fichiers concernés : `src/lib/data/season-bingo.ts`, `src/lib/data/collective-challenges.ts`.
Risque de doublon : **réel** — construire `secret_objectives` sans le relier explicitement au bingo et aux défis existants créerait trois systèmes parallèles à moitié redondants. Voir section "Recouvrements et doublons" plus bas.
Effort estimé : **M**, à condition de partir des deux systèmes existants plutôt que d'en créer un troisième.
Migration nécessaire : oui, mais à concevoir comme une évolution de `collective-challenges`/`season-bingo`, pas une table isolée.

## 11.3 Chronique automatique de saison

**Statut : PARTIELLEMENT IMPLÉMENTÉ**

Ce qui existe : `club-memory.ts::getClubTimeline()` génère déjà une frise à la volée (création du club, première victoire, premier triplé, plus grosse victoire, fins de saison, intronisations Hall of Fame) — c'est déjà un embryon de "chronique automatique", non stocké, non versionné, non figé par saison.
Ce qui manque : versioning, figeage à la clôture de saison, modification manuelle possible avant figeage.
Effort estimé : **M**.
Migration nécessaire : oui, si on veut stocker une version figée (`season_chronicles` ou équivalent) plutôt que recalculer indéfiniment.
Déployable indépendamment : oui.

## 11.4 Changelog visible

**Statut : À IMPLÉMENTER**

Aucun `src/content/changelog.ts` ni équivalent. La page `/help` documente les fonctionnalités actuelles de façon exhaustive mais statique (mise à jour manuelle à chaque lot), pas un changelog versionné avec badge "nouveau".
Effort estimé : **S**.
Migration nécessaire : non (fichier de contenu versionné dans le code, comme demandé par la V2 elle-même).
Déployable indépendamment : oui.

## 11.5 Signalement de bug

**Statut : À IMPLÉMENTER**

Aucune table `bug_reports`.
Effort estimé : **S-M**.
Migration nécessaire : oui.
Risque sur données existantes : aucun — attention particulière requise sur la consigne V2 ("ne jamais collecter automatiquement le PIN, les cookies ou des données privées de page") au moment de l'implémentation.

## 11.6 Réactions limitées

**Statut : TOUJOURS DIFFÉRÉ**

Décision déjà actée dans `ROADMAP_DEFERRED.md` (Lot 9) : "aucun système de réaction/commentaire n'existe [...] entièrement écarté pour l'instant." La V2 le réintroduit mais reste elle-même prudente ("si ajoutées, limiter à quelques emojis sur des objets précis"). Pas de valeur produit démontrée à ce jour pour un club de cette taille — à ne pas prioriser sans demande explicite.

## 11.7 Cycle formel des votes

**Statut : À IMPLÉMENTER**

Aucun statut `draft`/`open`/`closed`/`published`/`archived` sur `votes`, `monthly_mvp_votes`, ou `season_trophies`. Aujourd'hui : les votes de match sont "toujours ouverts jusqu'à ce qu'un admin regarde les résultats", le vote MVP du mois est "toujours ouvert, recalculé en direct" (décision déjà actée dans `ROADMAP_DEFERRED.md`, Lot 9), les trophées de saison sont attribués manuellement par l'admin sans vote d'équipe (également déjà noté).
Ce qui manque : le cycle complet, pour les trois mécanismes de vote existants.
Fichiers concernés : `src/lib/data/votes-actions.ts`, `src/lib/data/monthly-mvp.ts`, `src/lib/data/season-trophies-actions.ts`.
Tables/migrations : colonne de statut sur chacune des trois surfaces de vote, ou une table `vote_campaigns` générique les enveloppant toutes (préférable pour éviter la duplication, cohérent avec l'esprit "ne pas créer un système de token différent dans chaque module" appliqué par analogie).
Risque sur données existantes : aucun si additif.
Effort estimé : **L** (unifier trois mécanismes existants sous un même cycle, sans casser le comportement "toujours ouvert" actuellement en production).
Migration nécessaire : oui.
Déployable indépendamment : oui, mécanisme par mécanisme (commencer par les votes de match, qui ont déjà `castVote()` avec les vérifications serveur les plus solides).

## 11.8 Défis collectifs personnalisables

**Statut : REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE**

Ce qui existe : `collective-challenges.ts`, 4 défis fixes calculés à la volée (3 victoires consécutives, 5 matchs sans carton, 10 buteurs différents, présence collective moyenne) — décision déjà actée dans `ROADMAP_DEFERRED.md` (Lot 9), la V2 la réintroduit comme deuxième étape ("dans une deuxième étape, permettre aux admins de créer un défi à partir de modèles contrôlés").
Ce qui manque : le configurateur admin (métrique/opérateur/cible/période/secret ou public/récompense), avec la contrainte explicite de la V2 de ne jamais permettre de code ou SQL libre.
Effort estimé : **L** (nécessite un petit moteur de règles contrôlé, pas juste un formulaire).
Migration nécessaire : oui (`challenge_templates` ou équivalent).
Déployable indépendamment : oui, en complément des 4 défis fixes actuels (conservés, comme le précise la V2).

## 11.9 Citations liées à un match

**Statut : À IMPLÉMENTER**

Ce qui existe : `club_quotes.player_id` (facultatif) + `author_label` (texte libre de contexte) — décision déjà actée dans `ROADMAP_DEFERRED.md` (Lot 8) de ne pas ajouter de sélecteur de match dédié.
Ce qui manque : colonne `match_id` optionnelle + sélecteur dans l'interface d'ajout de citation.
Tables/migrations : `club_quotes.match_id uuid references matches(id)`, nullable.
Risque sur données existantes : aucun, additif — les citations déjà saisies avec un `author_label` texte libre restent valides sans `match_id`.
Effort estimé : **S**.
Migration nécessaire : oui, additive.
Déployable indépendamment : oui.

---

# PHASE 12 — Page publique, médias et stockage

## 12.1 Paramètres publics du club

**Statut : À IMPLÉMENTER**

`team_settings` n'a aucun des réglages listés (page publique activée, indexation, visibilité par section). Le seul mécanisme de "public" existant est **par joueur** (`players.public_profile_enabled`, déjà construit), pas au niveau du club.
Effort estimé : **M**.
Migration nécessaire : oui, additive sur `team_settings`.
Déployable indépendamment : oui.

## 12.2 Page publique

**Statut : À IMPLÉMENTER**

Il existe des pages publiques **par joueur** (`/profil/[token]`) et **par appel à renfort** (`/renfort/[token]`), mais aucune page publique **au niveau du club**.
Effort estimé : **M**.
Dépendances techniques : 12.1, 9.3 (si on veut que cette page utilise le futur système générique de liens).
Migration nécessaire : non pour une première version en lecture seule des données déjà publiques.

## 12.3 Supabase Storage et upload direct

**Statut : À IMPLÉMENTER**

Confirmé par recherche exhaustive : aucun usage de Supabase Storage nulle part dans le code (`grep storage` ne retourne aucun résultat applicatif). Toutes les photos actuelles (`players.photo_url`, maillots historiques) sont des **URL externes** — décision déjà actée dans `ROADMAP_DEFERRED.md` (Lots 8, 9, 11), réintroduite par la V2.
Ce qui manque : tout — buckets, règles de taille/type, compression, URLs signées pour le privé.
Effort estimé : **L** (nouvelle brique d'infrastructure, pas juste des tables).
Migration nécessaire : oui, côté Supabase Storage (buckets) plutôt que SQL classique — à documenter séparément des migrations `supabase/migrations/` habituelles.
Risque sur données existantes : aucun si les URL externes actuelles restent supportées en parallèle (la V2 le précise : "remplace **progressivement**").
Déployable indépendamment : oui.
Feature flag léger : recommandé, pour basculer champ par champ (photo de profil d'abord, puis maillots, puis galerie).

## 12.4 Galerie

**Statut : À IMPLÉMENTER**

Dépend entièrement de 12.3.

## 12.5 Cartes partageables

**Statut : DÉJÀ IMPLÉMENTÉ (pour l'existant) / À ÉTENDRE**

Ce qui existe : affiche de match, carte résultat, carte composition, carte joueur, carte carrière (`useCanvasShare.ts` + composants dédiés par page). Bonne base technique déjà éprouvée.
Ce qui manque : carte pour le résumé mensuel (11.3), le record (10.4), l'objectif secret (11.2), l'appel à renfort (existe déjà en fait — à vérifier précisément, `renfort` a déjà un partage WhatsApp, pas forcément une "carte" image dédiée).
Effort estimé : **S** par nouvelle carte, réutilisant le pattern `useCanvasShare` existant.
Migration nécessaire : non.

---

# PHASE 13 — Notifications et PWA avancée

**Statut global : À IMPLÉMENTER (phase entière, aucune sous-partie construite)**

Confirmé : aucun service worker personnalisé (`find public -iname "sw.js"` : aucun résultat), aucune table `push_subscriptions`/`notification_preferences`/`notification_events`. Le README ajouté ce jour documente déjà honnêtement cette absence dans sa section "Limites de la PWA", tout comme la page `/help` (section "Installation & limites", ajoutée ce jour).

Cette phase est explicitement qualifiée de "volontairement tardive" par la V2 elle-même (§13, "But") — cohérent avec sa position P3 dans le tableau des priorités (§4 de la V2). Aucune urgence identifiée.
Effort estimé : **XL** pour l'ensemble (service worker + modèle de données + règles anti-spam + cache).
Migration nécessaire : oui, plusieurs nouvelles tables.
Dépendances techniques : Phases 6-9 (la V2 le précise explicitement dans son tableau de dépendances §4) — les catégories de notification (rappel sans réponse, changement heure/lieu, covoiturage, tâche) supposent que les fonctionnalités sous-jacentes existent déjà avec des signaux fiables.
Risque sur données existantes : aucun (nouvelles tables), mais risque produit réel si mal calibré (spam, sur-notification) — la V2 le souligne fortement en §13.4.

---

# PHASE 14 — Fonctions expérimentales

**Statut global : À IMPLÉMENTER (phase entière) — explicitement non prioritaire**

Rien de construit, rien attendu avant la stabilisation complète des phases 0-13, conformément à la V2 elle-même. Pas d'analyse plus poussée nécessaire à ce stade — revisiter uniquement une fois les Phases 0-3 (sécurité/intégrité) et 5 (cycle de vie du match) livrées.

---

# Traitement des éléments de `ROADMAP_DEFERRED.md`

Vérification exhaustive, lot par lot, pour s'assurer qu'aucun élément différé n'est perdu, dupliqué, ou réintroduit à l'identique d'une solution déjà volontairement écartée.

| Élément différé (Lot d'origine) | Statut V2 (§2.4) | Statut réel vérifié | Remarque |
|---|---|---|---|
| Feature flags complets (Lot 0) | Remplacé | **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** | Confirmé : aucun système de flags n'existe encore, même léger. À construire au fil des lots qui en ont besoin (voir Phases 5, 12, 8.5), pas en bloc. |
| Environnement de démo séparé (Lot 0) | Remplacé | **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** | Toujours vrai — aucun second environnement Supabase n'existe. Redevient pertinent pour la Phase 2.4 Palier B (restauration testée). |
| Modale de confirmation générique (Lot 0) | — | **À IMPLÉMENTER** | Voir Phase 4.5 (`ConfirmDialog`). Pas encore construite malgré plusieurs lots qui en auraient bénéficié (ex. archivage joueur, sans confirmation aujourd'hui). |
| Formulaire de correction générique (Lot 0) | Réintroduit | **À IMPLÉMENTER** | Correspond exactement à la Phase 8.1. Pas de doublon à craindre, un seul système prévu. |
| Suite de tests complète (Lot 0) | — | **PARTIELLEMENT IMPLÉMENTÉ** | Voir Phase 0.2 — le socle "fonctions pures uniquement" est resté la doctrine du projet, confirmée par le README ajouté ce jour. |
| Lieux enregistrés (Lot 2) | Réintroduit (Phase 7) | **REMPLACÉ (temporaire) → À IMPLÉMENTER** | Voir Phase 7.1. Aucun risque de doublon, la migration prévue est additive avec transition. |
| Reprise matériel match précédent (Lot 2) | Réintroduit (Phase 7) | **À IMPLÉMENTER** | Voir Phase 7.3. |
| Rotation automatique du capitanat (Lot 2) | Réintroduit (Phase 7) | **À IMPLÉMENTER** | Voir Phase 7.3. |
| Date limite de réponse (Lot 3) | Réintroduit (Phase 6) | **À IMPLÉMENTER** | Voir Phase 6.4. |
| Verrouillage du groupe convoqué (Lot 3) | Réintroduit (Phase 5) | **À IMPLÉMENTER** | Voir Phase 5.8 — dépend du reste de la Phase 5, pas isolable. |
| Ajout groupé de buts (Lot 4) | Réintroduit (Phase 5) | **À IMPLÉMENTER** | Voir Phase 5.9. |
| Propositions de correction par les joueurs (Lot 4) | Réintroduit (Phase 8) | **À IMPLÉMENTER** | Voir Phase 8.1. |
| Page « À valider » complète (Lot 4) | Réintroduit (Phase 8) | **PARTIELLEMENT IMPLÉMENTÉ** | Voir Phase 8.3 — plus avancée aujourd'hui qu'au moment où `ROADMAP_DEFERRED.md` a été écrit (ajout de la section "matchs passés non finalisés" ce jour). |
| Modèles génériques de matchs (Lot 5) | Réintroduit (Phase 7) | **REMPLACÉ (temporaire) → À IMPLÉMENTER** | Voir Phase 7.6. `duplicateMatch` explicitement conservé en parallèle par la V2 — pas de duplication de concept à craindre si les deux mécanismes restent distincts et documentés comme tels. |
| QR codes (Lot 6) | Réintroduit (Phase 9) | **À IMPLÉMENTER** | Voir Phase 9.4. |
| Liens publics génériques (Lot 6) | Réintroduit (Phase 9) | **À IMPLÉMENTER** | Voir Phase 9.3. **Point de vigilance** : ne pas créer ce système sans migrer `reinforcement_calls` vers lui à terme, sous peine de deux mécanismes de token parallèles. |
| Filtres interactifs génériques (Lot 7) | — | **PARTIELLEMENT IMPLÉMENTÉ** | Voir Phase 10.6. Absent du registre "réintroduit" explicite de la V2 — à traiter comme secondaire. |
| Statistiques gardien (Lot 7) | Réintroduit (Phase 10) | **TOUJOURS DIFFÉRÉ** | Voir Phase 10.5, bloqué par la Phase 5.4. |
| Upload direct de photos (Lot 8) | Réintroduit (Phase 12) | **À IMPLÉMENTER** | Voir Phase 12.3. |
| Mur des citations lié à un match (Lot 8) | Réintroduit (Phase 11) | **À IMPLÉMENTER** | Voir Phase 11.9. |
| Trophées de fin de saison dans la frise (Lot 8) | — | **PARTIELLEMENT IMPLÉMENTÉ** | La frise (`getClubTimeline`) ne référence pas encore `season_trophies` — à ajouter une fois la Phase 11.3 (chronique) retravaillée. Pas de conflit avec l'existant. |
| Numéros retirés en table dédiée (Lot 8) | Conservé simplifié | **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** | Confirmé : `hall_of_fame_entries.retired_number` reste un champ, pas de table séparée. La V2 le confirme explicitement en §2.4 ("solutions légères conservées") — **ne pas réintroduire une table dédiée**, ce serait recréer une solution déjà écartée à dessein. |
| Case gardien du bingo (Lot 9) | — | **TOUJOURS DIFFÉRÉ** | Bloqué par la Phase 5.4, comme documenté depuis le Lot 9. |
| Réactions emoji (Lot 9) | Réintroduit (Phase 11, prudent) | **TOUJOURS DIFFÉRÉ** | Voir Phase 11.6 — la V2 elle-même reste prudente ; aucune urgence. |
| Défis collectifs personnalisables (Lot 9) | Réintroduit (Phase 11) | **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** (avec extension prévue) | Voir Phase 11.8. **Point de vigilance fort** : bien réutiliser `collective-challenges.ts` existant plutôt que créer un système parallèle — chevauchement avec `season-bingo.ts` et le futur `secret_objectives` (11.2) à clarifier avant de coder, sous peine de trois moteurs de "défi" incohérents entre eux. |
| Joueur du mois : cycle formel (Lot 9) | Réintroduit (Phase 11) | **À IMPLÉMENTER** | Voir Phase 11.7. |
| Trophées de saison : vote d'équipe (Lot 9) | Réintroduit (Phase 11) | **À IMPLÉMENTER** | Voir Phase 11.7. |
| Restauration automatique en un clic (Lot 10) | Toujours différé (conditionnel) | **TOUJOURS DIFFÉRÉ** | Confirmé — voir Phase 2.4 Palier C. Décision déjà actée avec l'utilisateur, la V2 la confirme avec des critères d'activation stricts. **Ne pas réintroduire sans satisfaire ces critères.** |
| Sauvegarde "avant fusion" (Lot 10) | — | **À IMPLÉMENTER** | Redevient pertinent avec la Phase 8.5 (fusion de joueurs invités), toujours pas construite. |
| Corbeille "joueurs" et "médias" (Lot 10) | — | **ABANDONNÉ (joueurs) / TOUJOURS DIFFÉRÉ (médias)** | Les joueurs ne sont jamais supprimés (archivage uniquement) — une corbeille "joueurs" n'a pas de sens dans le modèle actuel, à traiter comme abandonné sauf changement de modèle. La corbeille "médias" dépend de la Phase 12.3 (Storage), pas encore construite. |
| Verrouillage de saison par case à cocher (Lot 10) | — | **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** | Confirmé — le modèle "blocage ferme + déverrouillage temporaire centralisé" reste en production et a été *étendu* (pas remplacé) lors du sprint d'audit (Phase 3.4). La V2 ne redemande pas explicitement le modèle par case à cocher — **ne pas réintroduire**, ce serait revenir sur un choix déjà plus robuste que l'original. |
| Administrateur temporaire (Lot 10) | Toujours différé | **TOUJOURS DIFFÉRÉ** | Confirmé, `team_settings.access_code` existe en base mais n'est câblé à aucune logique de permission temporaire — colonne orpheline, pas un début d'implémentation. |
| Visibilité des statistiques (Lot 11) | — | **ABANDONNÉ** | Décision déjà actée avec l'utilisateur, non remise en cause par la V2 — les stats restent structurellement publiques dans l'équipe. |
| Upload de photo (Lot 11) | Réintroduit (Phase 12) | **À IMPLÉMENTER** | Voir Phase 12.3, doublon avec l'entrée Lot 8 ci-dessus (même chantier). |
| Consentement photo séparé (Lot 11) | Conservé simplifié | **REMPLACÉ PAR UNE SOLUTION PLUS SIMPLE** | Confirmé — le niveau de visibilité sert toujours de consentement, la V2 le confirme explicitement en §2.4. |
| Visibilité de la carte partageable (Lot 11) | — | **ABANDONNÉ** | Non repris par la V2, cohérent avec la décision déjà actée (stats déjà non sensibles). |
| Audit exhaustif "joueur archivé" (Lot 11) | Réintroduit (Phase 3) | **PARTIELLEMENT IMPLÉMENTÉ** | Voir Phase 3.6 — largement avancé ce jour (7 fichiers corrigés), un résidu à vérifier subsiste. |

---

# Fonctionnalités existantes absentes de la roadmap

Ces éléments sont en production aujourd'hui mais ne sont mentionnés nulle part, ou seulement implicitement, dans la V2 :

- **`getMatchReadiness()`** (`src/lib/data/match-readiness.ts`) — calcule déjà des alertes de préparation de match (effectif insuffisant, gardien manquant via le poste principal, covoiturage insuffisant, matériel non assigné), mais **n'est branché sur aucune page**. C'est une fonctionnalité écrite, testée par lecture de code, jamais affichée — un angle mort de la roadmap qui mériterait d'être explicitement repris dans la Phase 7.5 ("mode jour de match").
- **`player-goals.ts`** (objectifs personnels du joueur, "marquer 10 buts cette saison", avec visibilité privé/coachs/équipe) — fonctionnalité complète en production (Lot antérieur à l'audit), absente de toute mention dans la V2. Se distingue des "objectifs collectifs secrets" (11.2) par sa nature individuelle et non secrète.
- **`badges.ts`** (badges de joueur attribués automatiquement) — non mentionné explicitement dans la V2, qui parle de "défis" et d'"objectifs" mais pas de badges individuels persistants.
- **`season-bingo.ts`** — existe et fonctionne (5 cases sur 6), chevauche conceptuellement les "objectifs collectifs secrets" (11.2) sans y être identifié comme tel par la V2.
- **`data-health.ts`** / `/admin/sante` — tableau de bord de santé des données (matchs incomplets, âge de la dernière sauvegarde). Correspond en fait à la section "Observabilité et exploitation" (§9 de la V2, "page admin de santé des données") mais n'est jamais cité comme déjà existant — la V2 le redemande sans savoir qu'il est déjà là.
- **`team_settings.access_code`** — colonne présente en base, jamais utilisée par aucun code applicatif. Vestige d'une fonctionnalité jamais construite (probablement liée à une authentification par code d'équipe envisagée puis abandonnée). À documenter ou à retirer.
- **Comptes "Test Joueur" / "Test Admin"** — toujours présents dans la base de production (créés pendant la session d'audit pour des vérifications ponctuelles). Non liés à la roadmap, mais à traiter avant le prochain lot pour ne pas les oublier indéfiniment.

---

# Recouvrements et doublons

1. **`season-bingo.ts` / `collective-challenges.ts` / future Phase 11.2 (`secret_objectives`) / future Phase 11.8 (défis personnalisables)** — quatre mécanismes de "challenge collectif" qui se recoupent conceptuellement. Avant de construire quoi que ce soit sur 11.2 ou 11.8, une décision de conception explicite est nécessaire : soit un seul moteur générique alimentant les trois usages (bingo = affichage, défis fixes = un cas particulier, secrets = un autre cas particulier), soit une justification claire de pourquoi ils doivent rester distincts. Risque concret de tripler la logique de calcul de progression si non traité en amont.

2. **`reinforcement_calls` (token/expiration/révocation) / future Phase 9.3 (liens publics génériques) / `players.calendar_token` + `players.public_token`** — trois systèmes de lien partageable avec des garanties différentes (le premier a expiration+révocation, les deux derniers n'ont que la régénération). La Phase 9.3 doit absorber les trois, pas en ajouter un quatrième.

3. **`monthly-mvp.ts` / `votes-actions.ts` / `season-trophies-actions.ts`** — trois mécanismes de vote/attribution de récompense indépendants (vote de match toujours ouvert et scopé au match, MVP du mois toujours ouvert et recalculé, trophées de saison attribués manuellement sans vote). La Phase 11.7 ("cycle formel des votes") doit les unifier sous un même modèle de statut — actuellement, ce sont trois implémentations distinctes de la même idée générale ("les gens votent pour quelqu'un").

4. **`match_players.goalkeeper` / `availability.goalkeeper_available` / `players.primary_position === "Gardien"` (utilisé en contournement par `getMatchReadiness()`)** — trois façons différentes, aujourd'hui incohérentes entre elles, de savoir "qui est gardien". La Phase 5.4 doit trancher laquelle fait foi (probablement `match_players.goalkeeper`, la plus précise car par match) et migrer `getMatchReadiness()` pour l'utiliser une fois disponible.

5. ~~`resetSeasonData()` / `startNewSeason()` coexistaient avec des garanties très différentes~~ — **résolu par le Lot 2 (commit `960cda0`, 18/07/2026)** : `resetSeasonData()` est neutralisée, `startNewSeason()` (`/admin/saisons`) est désormais l'unique parcours actionnable. Le code de `resetSeasonData()` reste présent mais mort — voir Phase 0.1 mise à jour.

6. **`BACKUP_TABLES` (24 tables) / schéma réel (27 tables)** — `audit_log` est la seule table métier absente du registre de sauvegarde, par choix documenté. Ne pas confondre avec un oubli lors d'une future revue.

---

# Migrations futures probables

Liste des migrations anticipées par cette analyse, **non exécutées**, classées par phase d'origine :

| Migration probable | Phase | Nature | Risque |
|---|---|---|---|
| `team_settings.owner_player_id` | 1.1 | Additive, nullable | Faible |
| `players.last_pin_change_at`, `last_role_change_at` | 1.2 | Additive, nullable — écartée au Lot 4 faute d'usage UI, à reconsidérer si besoin | Faible |
| `login_attempts` (nouvelle table) | 1.3 | Additive | Faible |
| ~~Contrainte unique partielle `seasons` (une seule active)~~ | 3.1 | Faite — Lot 3, `20260718040000_season_active_unique.sql` | — |
| RPC transactionnelles (blessure+dispo, restauration audit, clôture saison, fusion) | 3.2, 8.5 | Fonctions, pas de schéma | Faible par fonction |
| `matches.started_at`, `ended_at`, `completion_status`, `validated_at`, `validated_by_player_id` | 5.1 | Additive, nullable | Faible |
| `player_restrictions` (nouvelle table) | 6.2 | Additive | Faible |
| `matches.response_deadline` ; `availability.first_responded_at`, `last_changed_at`, `late_response` | 6.4 | Additive, nullable | Faible |
| `venues` (nouvelle table) + `matches.venue_id` | 7.1 | Additive avec transition | Moyen (dédoublonnage des adresses existantes) |
| `match_equipment_items.status` (texte contraint, remplaçant/étendant `brought`) | 7.3 | **Changement de type** | Moyen — suivre la règle "nullable d'abord" de la V2 §1.5 |
| `checklist_templates`, `player_checklist_preferences`, `match_checklist_items` | 7.4 | Additives | Faible |
| `match_templates` (nouvelle table) | 7.6 | Additive | Faible |
| `correction_requests` (nouvelle table) | 8.1 | Additive | Faible |
| `match_confirmations` (nouvelle table) | 8.2 | Additive | Faible — dépend de 5.1 |
| Système générique de liens publics (`public_links` ou équivalent) | 9.3 | Additive + migration de `reinforcement_calls` | Moyen — ne pas casser les liens déjà partagés |
| `players.calendar_token_regenerated_at`, `public_token_regenerated_at` | 9.5 | Additive, nullable | Faible |
| `ideas`, `idea_votes`, `idea_comments` | 11.1 | Additives | Faible |
| Évolution `season-bingo`/`collective-challenges` vers un moteur commun (`secret_objectives` ou fusion) | 11.2 | À concevoir avant de migrer | Moyen — voir "Recouvrements" |
| `season_chronicles` (versionnement de la frise) | 11.3 | Additive | Faible |
| `bug_reports` (nouvelle table) | 11.5 | Additive | Faible |
| Statut de cycle (`draft`/`open`/`closed`/`published`/`archived`) sur votes/MVP/trophées, ou `vote_campaigns` générique | 11.7 | Additive | Faible |
| `challenge_templates` (nouvelle table) | 11.8 | Additive | Faible |
| `club_quotes.match_id` | 11.9 | Additive, nullable | Faible |
| Réglages publics sur `team_settings` | 12.1 | Additive | Faible |
| Buckets Supabase Storage (`public-media`, `private-media`, `bug-report-media`) | 12.3 | Infrastructure Storage, pas SQL classique | Moyen — nouvelle surface de sécurité (types de fichiers, taille, URLs signées) |
| `push_subscriptions`, `notification_preferences`, `notification_events` | 13.2 | Additives | Faible |

---

# Dette technique restante

**Résolu depuis la dernière analyse :**
- ~~Restauration depuis la corbeille et annulation depuis l'historique contournant le verrouillage de saison~~ — fermé par le Lot 1 (commit `ed7043c`, 18/07/2026). Voir Phase 3.3/3.4 mises à jour.
- ~~Bouton de réinitialisation destructive toujours actif en production~~ — fermé par le Lot 2 (commit `960cda0`, 18/07/2026). Voir Phase 0.1 mise à jour.

Par ordre de gravité décroissante :

1. **Commentaire trompeur dans `backups.ts:43`** ("REPEATABLE READ" alors que le comportement réel est READ COMMITTED via un appel RPC unique) — risque de faire croire à une garantie d'isolation plus forte que celle réellement livrée, pour un futur lecteur humain ou agent.

2. **Trois mécanismes de token de lien partageable non unifiés** (`reinforcement_calls` avec expiration/révocation ; `calendar_token`/`public_token` sans expiration, régénérables seulement) — pas un bug, mais une incohérence de garanties selon la fonctionnalité utilisée par le joueur.

3. **Colonnes orphelines en base** : `match_players.goalkeeper`, `availability.goalkeeper_available`, `team_settings.access_code`, `players.is_guest` — posées à l'avance pour des fonctionnalités jamais branchées. Sans danger immédiat, mais source de confusion pour quiconque lit le schéma sans le contexte historique (ce document devrait servir de mémoire à ce sujet).

4. **Pas de test automatisé sur les permissions et le verrouillage de saison** (Phase 0.2) — la couverture du verrouillage de saison sur la corbeille/l'historique dispose désormais de tests purs ciblés (`season-lock.test.ts`) et d'une vérification manuelle de bout en bout (Lot 1), mais le reste des permissions (login, rôles, rate limiting) repose encore uniquement sur des vérifications manuelles faites pendant le sprint d'audit, non reproductibles automatiquement à chaque changement futur.

5. **Contraintes d'unicité potentiellement absentes côté base** sur `availability` (réponse par joueur/match) et `votes` (vote par joueur/match/catégorie) — actuellement garanties uniquement par la logique applicative (upsert avec recherche préalable), pas par une contrainte SQL. Un accès direct à la base ou un bug applicatif pourrait créer un doublon.

6. **Aucun `loading.tsx`/`error.tsx`** nulle part dans `src/app` — une erreur non gérée dans un Server Component fait planter la page entière sans état de repli.

7. **`resetSeasonData()` reste dans le code, désormais neutralisée mais non supprimée** — plus une vraie coexistence avec `startNewSeason()` (le bouton n'existe plus, un seul parcours est actionnable), mais un petit résidu de code mort à trancher un jour : le supprimer pour de bon, ou le garder comme filet en cas de besoin futur documenté.

---

# Ordre d'implémentation recommandé

_**Note (18/07/2026) :** cette section des « cinq prochains lots » est désormais historique — `ROADMAP_EXECUTION_COMPLETE_CHARENTON_FC_V3.md` est devenue le document directeur unique d'exécution, avec sa propre séquence de 39 lots (0 à 38) qui remplace celle-ci. Conservée ici pour la traçabilité : les Lots 1 et 2 proposés ci-dessous correspondent exactement aux Lots 1 et 2 de la V3, tous deux livrés._

Cinq lots maximum, chacun à objectif unique, petit, déployable indépendamment, testable, réversible, et ne mélangeant pas sécurité / refonte UI / nouvelles fonctionnalités sans nécessité — conformément à la contrainte du brief.

## Lot 1 — Fermer le contournement du verrouillage de saison

**Statut : LIVRÉ — commit `ed7043c`, déployé et vérifié en production le 18/07/2026.**

**But :** empêcher qu'une restauration depuis la corbeille ou une annulation depuis l'historique modifie un match appartenant à une saison verrouillée — le seul écart de sécurité concret identifié par cette analyse (Phase 3.3/3.4).

**Périmètre exact :** ajouter `assertMatchSeasonUnlocked()` dans `trash-actions.ts` (restauration de match/but/carton) et dans `audit-actions.ts::restoreChange` (résolution du `matchId` depuis `record_id`/`table_name` de l'entrée audit, puis vérification). Aucun changement d'interface visible.

**Fichiers probables :** `src/lib/data/trash-actions.ts`, `src/lib/data/audit-actions.ts`.
**Migrations :** aucune.
**Tests nécessaires :** restauration de but/carton/match refusée sur une saison verrouillée (corbeille) ; annulation refusée sur une saison verrouillée (historique) ; les deux chemins continuent de fonctionner normalement sur une saison déverrouillée.
**Risques :** très faible — ajout d'une vérification déjà éprouvée ailleurs (7 autres Server Actions l'utilisent déjà avec succès).
**Critères d'acceptation :** un but supprimé appartenant à un match d'une saison verrouillée ne peut plus être restauré sans déverrouiller la saison d'abord ; le message d'erreur est identique à celui déjà utilisé par les autres Server Actions verrouillées.
**Ordre de déploiement :** en premier, sans dépendance.

## Lot 2 — Retirer la réinitialisation destructive du parcours normal

**Statut : LIVRÉ — commit `960cda0`, déployé et vérifié en production le 18/07/2026 (Lot 2 de la roadmap V3).**

**But :** achever la Phase 0.1/2.5 en s'appuyant sur l'alternative non destructive déjà en production (`startNewSeason`), au lieu de laisser un bouton de suppression irréversible accessible en permanence.

**Périmètre exact :** masquer/retirer `ResetButton` de `/profile` (ou le déplacer derrière un réglage explicite, par exemple un flag `SEASON_RESET_ENABLED` en dur dans le code, désactivé par défaut) ; faire retourner une erreur contrôlée et explicite si l'action est appelée directement pendant que le flag est désactivé ; ajouter un lien visible depuis `/profile` vers `/admin/saisons` pour orienter vers le chemin recommandé.

**Fichiers probables :** `src/app/profile/page.tsx`, `src/app/profile/ResetButton.tsx`, `src/lib/data/reset-actions.ts`.
**Migrations :** aucune.
**Tests nécessaires :** appel direct de `resetSeasonData` refusé quand le flag est désactivé ; `/admin/saisons` reste pleinement fonctionnel.
**Risques :** faible — ne supprime pas le code, le neutralise. Réversible en une ligne si besoin (remettre le flag à `true`).
**Critères d'acceptation :** aucun admin ne peut plus déclencher une suppression de matchs depuis l'interface normale ; le chemin `startNewSeason` reste l'unique façon recommandée de changer de saison, documentée dans l'aide.
**Ordre de déploiement :** après le Lot 1 (pas de dépendance technique stricte, mais cohérent de traiter les deux sujets "saison" ensemble).

## Lot 3 — Brancher `getMatchReadiness()` sur l'accueil

**But :** livrer de la valeur immédiate à effort minimal — une fonction de détection de manques (gardien, effectif, covoiturage, matériel) déjà écrite et fonctionnelle, mais jamais affichée nulle part (Phase 7.5).

**Périmètre exact :** afficher les alertes de `getMatchReadiness(matchId)` sur l'accueil pour le prochain match, sous forme d'une petite liste non bloquante ("⚠️ Aucun gardien confirmé", etc.), visible seulement des admins/coachs (ce sont eux qui peuvent agir dessus). Aucun changement de logique métier — uniquement du câblage d'affichage.

**Fichiers probables :** `src/app/page.tsx`.
**Migrations :** aucune.
**Tests nécessaires :** aucune régression sur l'accueil existant ; les alertes n'apparaissent que pour les rôles admin/coach ; un match sans problème n'affiche rien (pas de bruit visuel).
**Risques :** très faible — fonctionnalité déjà écrite et implicitement "testée" par sa logique pure, seul le branchement est nouveau.
**Critères d'acceptation :** un match avec un effectif insuffisant ou du matériel non assigné affiche une alerte visible sur l'accueil, sans bloquer aucune action.
**Ordre de déploiement :** indépendant des Lots 1-2, peut être fait en parallèle.

## Lot 4 — Contraintes SQL restantes (saison unique, votes, réponses)

**Statut : LIVRÉ — commit `c9ed882`, déployé et vérifié en production le 18/07/2026 (Lot 3 de la roadmap V3). Périmètre réduit en cours de route : les contraintes `availability`/`votes`/`goal_type` existaient déjà depuis la migration baseline — seule l'unicité de la saison active manquait réellement. Voir Phase 3.1 mise à jour.**

**But :** fermer les derniers écarts de la Phase 3.1 — garantir en base ce qui n'est aujourd'hui garanti que par convention applicative.

**Périmètre exact :** avant toute migration, exécuter des requêtes de vérification en lecture seule contre la production pour confirmer l'absence de violation existante (une seule saison active, pas de doublon de vote, pas de doublon de réponse de présence). Si tout est propre, poser : index unique partiel sur `seasons(is_active) where is_active`, contrainte UNIQUE sur `availability(match_id, player_id)` si absente, contrainte UNIQUE sur `votes(match_id, award_id, voter_player_id)` si absente, `check` sur `goals.goal_type`.

**Fichiers probables :** nouvelle migration `supabase/migrations/`, pas de changement de code applicatif attendu (les contraintes ne font que confirmer un comportement déjà respecté par le code).
**Migrations :** oui, une migration additive avec plusieurs `alter table`.
**Tests nécessaires :** tentative d'insertion violant chaque contrainte refusée avec une erreur claire.
**Risques :** faible si la vérification préalable ne remonte aucune violation ; **la migration doit être annulée et retravaillée si une violation existante est trouvée** — ne jamais forcer une contrainte sur des données déjà incohérentes sans les corriger d'abord.
**Critères d'acceptation :** les quatre contraintes sont actives en production ; aucune fonctionnalité existante n'est cassée (les upserts applicatifs actuels doivent déjà respecter ces règles, donc aucun changement de comportement visible attendu).
**Ordre de déploiement :** après le Lot 1 (cohérent de regrouper les corrections d'intégrité), indépendant des Lots 2-3.

## Lot 5 — Gardien par match (fondation isolée de la Phase 5)

**But :** alimenter enfin `match_players.goalkeeper`, une colonne posée depuis le début du projet mais jamais branchée — un prérequis isolable pour les statistiques gardien (Phase 10.5), le bingo complet (case manquante depuis le Lot 9), et la Phase 5 complète, sans construire le mode "Match en cours" dans son ensemble.

**Périmètre exact :** sur l'écran de confirmation de la feuille de match (`confirmMatchRoster` / son interface), ajouter un bouton "Définir comme gardien" par joueur présent, écrivant `match_players.goalkeeper`. Autoriser plusieurs gardiens par match (remplacement en cours de match), sans minutes obligatoires. Afficher le gardien désigné dans la fiche match et le mode jour de match. Faire évoluer `getMatchReadiness()` pour lire `match_players.goalkeeper` en priorité, avec repli sur `primary_position === "Gardien"` si aucun gardien n'est encore désigné pour ce match précis (transition douce, pas de rupture).

**Fichiers probables :** `src/lib/data/roster-actions.ts`, `src/lib/data/roster.ts`, `src/app/matches/[id]/page.tsx`, `src/lib/data/match-readiness.ts`.
**Migrations :** aucune (la colonne existe déjà) — vérifier seulement qu'aucune contrainte manquante n'empêche plusieurs `true` par match (c'est déjà le cas, `goalkeeper` est un simple booléen par ligne).
**Tests nécessaires :** gardien désigné et affiché correctement ; plusieurs gardiens acceptés sur un même match ; aucun gardien désigné → avertissement non bloquant (déjà existant via `getMatchReadiness`) ; gardien conservé dans l'historique même si le joueur est archivé ensuite (dépend du Lot de la Phase 3.6, déjà largement traité).
**Risques :** faible — additif, ne modifie aucune donnée existante, `goalkeeper` reste à `false` par défaut pour toutes les lignes déjà en base.
**Critères d'acceptation :** un admin peut désigner un gardien depuis la feuille de match en un clic ; ce gardien apparaît sur la fiche du match ; `getMatchReadiness` utilise la vraie désignation dès qu'elle existe pour un match donné.
**Ordre de déploiement :** en dernier des cinq — bénéficie d'être fait après que les Lots 1 et 4 aient renforcé l'intégrité générale des écritures sur `match_players`/`matches`, bien qu'il n'en dépende pas strictement.

---

_Aucune implémentation n'a été commencée. En attente de validation explicite du premier lot avant toute action._
