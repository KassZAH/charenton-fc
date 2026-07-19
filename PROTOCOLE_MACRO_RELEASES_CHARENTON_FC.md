# Charenton FC - Protocole de macro-releases

## 1. Objet

Ce document définit la nouvelle méthode d'exécution de la roadmap après validation du Lot 11.5.

Objectif :

- réduire les validations intermédiaires ;
- livrer des versions fonctionnelles complètes ;
- automatiser les preuves techniques ;
- conserver un niveau élevé de sécurité sur Supabase, Vercel et les données réelles ;
- garder chaque lot identifiable, testable et réversible.

Ce document complète `ROADMAP_EXECUTION_COMPLETE_CHARENTON_FC_V3.md`.

Il remplace uniquement, pour les lots explicitement regroupés ci-dessous :

- la règle « un seul lot à la fois » ;
- l'arrêt utilisateur obligatoire après chaque lot ;
- l'interdiction générale de regrouper plusieurs lots.

Toutes les autres règles de la Roadmap V3 restent applicables.

---

## 2. État de départ

Avant d'utiliser ce protocole, l'agent doit confirmer :

- Lots 0 à 11.5 terminés et validés en production ;
- `master`, `origin/master` et la production alignés ;
- base Supabase partagée intacte ;
- migrations locales et distantes alignées ;
- `ROADMAP_STATUS.md` et la Roadmap V3 cohérents ;
- aucun lot suivant déjà commencé sur une branche abandonnée.

En cas de divergence, l'agent corrige d'abord la documentation ou s'arrête si une modification métier est nécessaire.

---

## 3. Découpage officiel en macro-releases

| Macro-release | Lots | Version fonctionnelle |
|---|---:|---|
| A - Match Day v1 | 12 à 18 | Préparation, gardiens, cycle de vie, live, concurrence, convoqués, saisie groupée |
| B - Organisation d'équipe | 19 à 24 | Restrictions, deadlines, rotation, terrains, covoiturage, matériel, capitaine, checklist |
| C - Collaboration et partage | 24.5, 25 à 28 | Fiabilité de présence, corrections, confirmations, annulation, invités, fusion sécurisée, liens et QR |
| D - Stats et récompenses | 29 à 30 | Statistiques intelligentes et cycle formel des votes |
| E - Vie du club et médias | 31 à 34 | Changelog, bugs, idées, défis, chronique, page publique, galerie et Storage |
| F - PWA avancée | 35 à 36 | Notifications, préférences, service worker et hors ligne minimal |
| Expérimental | 37 | Lot isolé, uniquement après nouvelle validation |
| Clôture de roadmap | 38 | Revue documentaire uniquement |

Le Lot 37 ne doit jamais être inclus automatiquement dans une macro-release.

Le Lot 38 ne déclenche aucune migration ou livraison fonctionnelle.

---

## 4. Principe général d'exécution

Pour chaque macro-release :

1. créer une branche dédiée depuis `master` à jour ;
2. conserver un commit distinct par lot ;
3. exécuter les gates après chaque lot ;
4. continuer automatiquement vers le lot suivant si les gates sont verts ;
5. utiliser le projet Supabase isolé pour toutes les migrations et écritures de test ;
6. produire une seule preview consolidée ;
7. demander une seule validation utilisateur globale ;
8. après cette validation, demander une seule autorisation de production ;
9. déployer automatiquement les vagues internes prévues ;
10. produire un rapport final unique ;
11. s'arrêter avant la macro-release suivante.

L'agent ne doit pas demander une validation pour des choix internes équivalents, des noms de composants, des détails CSS ou de petites corrections techniques.

---

## 5. Conditions d'arrêt anticipé

L'agent s'arrête uniquement si au moins une condition suivante est rencontrée :

- migration destructive ou modification irréversible non prévue ;
- risque de perte ou de corruption de données ;
- décision produit réellement ambiguë et non couverte par la roadmap ;
- coût, abonnement ou infrastructure externe supplémentaire ;
- secret ou permission indispensable inaccessible ;
- tests durablement rouges après une tentative raisonnable de correction ;
- faille de sécurité non résolue ;
- conflit réel entre deux lots de la macro-release ;
- nécessité d'une opération manuelle sur les vraies données.

L'agent ne s'arrête pas pour :

- demander une préférence de nommage ;
- demander une validation visuelle intermédiaire ;
- choisir entre deux implémentations internes équivalentes ;
- corriger lint, typecheck, build, lockfile ou CI ;
- ajuster une fixture isolée ;
- terminer un commit intermédiaire.

Toute déviation doit être documentée dans le rapport final.

---

## 6. Git et structure des commits

### Branche

Une branche par macro-release :

- `macro-a-match-day-v1`
- `macro-b-team-organization`
- `macro-c-collaboration-sharing`
- `macro-d-stats-awards`
- `macro-e-club-media`
- `macro-f-pwa-advanced`

### Commits

Au minimum :

- un commit fonctionnel distinct par lot ;
- un commit de tests séparé si les tests couvrent plusieurs lots ;
- un commit documentaire final ;
- des correctifs d'infrastructure isolés si nécessaire.

Interdictions :

- aucun commit géant mélangeant toute la macro-release ;
- aucun force-push sur `master` ;
- aucune réécriture d'une migration historique appliquée ;
- aucun secret ou fichier `.env` suivi par Git.

Un rebase est autorisé uniquement sur la branche de macro-release, avec `--force-with-lease`, jamais sur `master`.

---

## 7. Gates automatiques

### Après chaque lot

Exécuter au minimum :

```bash
npm ci
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Exécuter également les tests d'intégration concernés contre le projet isolé.

Une erreur corrigible doit être corrigée immédiatement, puis le gate relancé. L'utilisateur n'est pas sollicité pour cela.

### À la fin de la macro-release

Exécuter :

```bash
npm ci
npx tsc --noEmit
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Les tests d'intégration et E2E doivent viser exclusivement l'environnement isolé.

---

## 8. Automatisation obligatoire

### 8.1 Tests d'intégration dans la CI

Le workflow doit :

- exécuter typecheck, lint, tests unitaires et build sur chaque branche et pull request ;
- exécuter les tests d'intégration si les secrets isolés sont disponibles ;
- ne jamais utiliser les secrets de production ;
- afficher clairement lorsqu'un job est ignoré ;
- sérialiser les tests utilisant les mêmes fixtures ;
- remettre le dataset isolé dans un état déterministe.

### 8.2 Playwright

Avant ou pendant la Macro A, ajouter un socle Playwright réutilisable couvrant :

- login Joueur ;
- login Coach ;
- login Propriétaire ;
- permissions principales ;
- scénario métier central de chaque macro-release ;
- viewport mobile ;
- viewport desktop ;
- absence d'erreur serveur visible ;
- nettoyage des données temporaires.

Les tests E2E ne remplacent pas les tests unitaires ou d'intégration.

### 8.3 Vérificateur de déploiement

Créer un script de contrôle post-déploiement qui vérifie automatiquement :

- hash Git exact déployé ;
- état Vercel `READY` ;
- migrations attendues ;
- absence de migrations inattendues ;
- RLS activée sur toute nouvelle table ;
- permissions `anon`, `authenticated`, `service_role` ;
- nouvelles tables ajoutées aux backups ;
- absence de fixture ou donnée de démonstration en production ;
- compteurs métier avant/après ;
- santé des pages principales ;
- absence de réponse HTTP 500 ;
- conservation de la saison active et du propriétaire.

Le script doit produire un rapport lisible et échouer en cas de divergence.

---

## 9. Supabase et sécurité des données

### Avant la validation de preview

- aucune migration sur le projet partagé ;
- aucune écriture sur les vraies données ;
- migrations appliquées uniquement au projet isolé ;
- dataset fictif déterministe ;
- aucune copie de données personnelles réelles ;
- variables Vercel limitées au déploiement de preview concerné.

### Pour toute nouvelle table

Vérifier obligatoirement :

- RLS activée ;
- policies minimales et explicites ;
- accès `anon` refusé sauf besoin public documenté ;
- données sensibles non exposées ;
- table ajoutée au registre de backup ;
- table incluse dans les tests de couverture des backups ;
- restauration globale non supposée disponible.

### Pour toute nouvelle RPC sensible

Vérifier :

- `SECURITY DEFINER` si nécessaire ;
- `search_path` explicite ;
- `EXECUTE` révoqué à `PUBLIC`, `anon` et `authenticated` ;
- accès réservé à `postgres` et `service_role` ;
- permission métier vérifiée dans la Server Action ;
- audit minimal sans secret ni snapshot complet ;
- idempotence et concurrence si plusieurs écritures.

---

## 10. Preview consolidée

Une seule preview est créée après la fin de tous les lots de la macro-release.

Elle doit :

- pointer exclusivement vers le projet isolé ;
- contenir toutes les migrations de la macro-release ;
- utiliser des fixtures déterministes ;
- être testable avec les trois rôles ;
- proposer un scénario complet, pas une série de micro-tests ;
- permettre de revenir rapidement à un état propre ;
- ne modifier aucune variable Vercel générale Preview ou Production.

Le rapport de preview contient :

- URL ;
- branche et hash ;
- commits par lot ;
- migrations ;
- résultats des gates ;
- résultats CI ;
- résultats E2E ;
- preuve que la base partagée est intacte ;
- une checklist utilisateur unique et courte ;
- risques et limites ;
- rollback par lot.

---

## 11. Validation utilisateur

Une seule validation manuelle est demandée par macro-release.

La checklist doit :

- tester une version complète et utilisable ;
- être regroupée par scénario métier ;
- éviter les contrôles déjà couverts par l'automatisation ;
- ne pas dépasser environ dix vérifications principales ;
- préciser les actions destructives interdites ;
- utiliser uniquement des données fictives sur la preview.

Après validation, l'utilisateur donne une autorisation unique de production pour toute la macro-release.

---

## 12. Déploiement en production

### Préparation

Avant toute migration :

- confirmer les compteurs métier ;
- confirmer l'état de la saison active ;
- confirmer le propriétaire ;
- confirmer l'absence de fixtures ;
- créer un backup protégé format 2 ;
- finaliser et revérifier son checksum ;
- confirmer l'artefact `audit_log`.

### Vagues internes

L'agent peut déployer la macro-release en plusieurs vagues techniques sans redemander l'autorisation, à condition que :

- les vagues aient été annoncées dans le plan ;
- chaque vague possède son rollback ;
- les contrôles automatiques soient verts ;
- aucune divergence ne soit détectée.

Ordre recommandé :

1. schéma additif ;
2. code backend ;
3. code UI ;
4. documentation.

### Après chaque vague

Le vérificateur post-déploiement doit contrôler :

- commit ;
- Vercel ;
- migrations ;
- RLS ;
- permissions ;
- backups ;
- compteurs ;
- pages principales ;
- absence de mutation métier inattendue.

L'agent continue automatiquement vers la vague suivante si tout est conforme.

---

## 13. Rapport final de production

Le rapport final unique doit fournir :

- backup pré-déploiement ;
- migrations appliquées ;
- hashes et URLs ;
- résultats CI et gates ;
- résultats E2E ;
- permissions et RLS ;
- couverture des backups ;
- compteurs avant/après ;
- données temporaires créées et nettoyées ;
- écarts rencontrés et corrections ;
- rollback par lot ;
- documentation mise à jour ;
- confirmation que la macro-release suivante n'a pas commencé.

Après le rapport, l'agent attend une validation finale courte de l'utilisateur.

---

## 14. Mise à jour de la roadmap

Sur la branche de macro-release :

- chaque lot est marqué « implémenté en preview » après son gate ;
- aucun lot n'est marqué définitivement terminé avant la production.

Après production et validation finale :

- `ROADMAP_STATUS.md` indique chaque lot terminé ;
- la Roadmap V3 marque les lots concernés `TERMINÉ` ;
- les éléments réellement différés sont ajoutés à `ROADMAP_DEFERRED.md` ;
- aucune autre section n'est réécrite sans nécessité.

---

## 15. Périmètre des macro-releases

### Macro A - Lots 12 à 18

Version : Match Day v1.

Une seule validation doit couvrir :

- alertes de préparation ;
- gardiens ;
- cycle de vie ;
- match en cours ;
- concurrence ;
- groupe convoqué ;
- saisie groupée.

### Macro B - Lots 19 à 24

Version : Organisation d'équipe.

Une seule validation doit couvrir :

- restriction et retour progressif ;
- deadline de réponse ;
- rotation ;
- terrains et modèles ;
- covoiturage ;
- matériel, capitaine et checklist.

### Macro C - Lots 24.5, 25 à 28

Version : Collaboration et partage.

Le Lot 24.5 (fiabilité de présence, ajouté le 2026-07-19 après la production de la Macro B) ouvre cette macro-release — commit et gate ciblé distincts, avant les Lots 25 à 28, dans la même preview consolidée.

Le Lot 27 reste un commit et un sous-ensemble à haut risque. Toute fusion réelle est interdite pendant la preview.

### Macro D - Lots 29 à 30

Version : Stats et récompenses.

Le cycle de votes doit être la source officielle des nouvelles statistiques de récompenses.

### Macro E - Lots 31 à 34

Version : Vie du club et médias.

Vagues internes recommandées :

- E1 : Lots 31 et 32 ;
- E2 : Lots 33 et 34.

La confidentialité publique et Storage doit être testée en navigation privée.

### Macro F - Lots 35 à 36

Version : PWA avancée.

Notifications et service worker doivent être conçus ensemble afin d'éviter deux implémentations concurrentes.

---

## 16. Formule de clôture

À la fin d'une macro-release, utiliser :

> **Macro-release X terminée en preview. Tous les lots concernés ont leurs commits, leurs gates et leurs tests. Je n'ai pas commencé la macro-release suivante. J'attends la validation utilisateur unique avant la production.**

Après production :

> **Macro-release X déployée et vérifiée en production. Je n'ai pas commencé la macro-release suivante. J'attends la validation finale de l'utilisateur.**
