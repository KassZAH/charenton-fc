# Éléments de la roadmap laissés de côté

_Suivi des sous-fonctionnalités volontairement écartées lors de l'implémentation des lots de `ROADMAP_Charenton.md`, pour ne pas les perdre de vue._

## Lot 0 — Fondations techniques

Lot allégé pour une appli à un seul admin. Écarté :
- Système de feature flags complet (une version light suffit si le besoin se présente)
- Environnement de démo séparé avec fausses données
- Modale de confirmation générique
- Formulaire de correction générique
- Suite de tests complète (fait : un socle minimal ciblé sur les fonctions pures à risque)

## Lot 1 — Blessures et disponibilité

Implémenté intégralement, rien d'écarté.

## Lot 2 — Logistique du match

- **Lieux enregistrés** : fiche complète par terrain (nom, adresse, lien Maps, parking, vestiaires, code d'accès, type de terrain, commentaire pratique) — fait à la place : adresse + lien Maps directement sur chaque match, sans terrain réutilisable
- Réutilisation des terrains déjà enregistrés (dépend du point précédent)
- Reprise automatique du matériel du match précédent
- Suggestion de rotation automatique du capitanat

## Lot 3 — Mode Jour de match

- Date limite de réponse souhaitée, avec badge "Réponse tardive" sur les réponses arrivées après coup
- Relance qui exclut automatiquement les joueurs indisponibles/blessés de la liste (actuellement : la relance liste tout le monde sans réponse, les blessés en sont déjà exclus via le Lot 1, mais pas de notion de date limite)
- Verrouillage du groupe par l'admin : convoqués, liste d'attente, gardiens, capitaine figés une fois décidés

## Lot 4 — Résultat express et corrections

- Ajout groupé de plusieurs buts d'un coup (ex. "Karim 2 buts, Amine 1 but, CSC adverse 1 but" en une seule saisie) — fait à la place : ajout un but à la fois, avec sélecteur de type (but / CSC adverse / CSC Charenton)
- Propositions de correction soumises par les joueurs avec validation admin (changement de buteur, ajout de passe, correction de présence/score, retrait de carton) — en attendant, un admin peut corriger directement sans passer par une file d'attente de validation
- Page « À valider » complète : les sections « invités à fusionner » et « votes à clôturer » n'existent pas encore (dépendent de concepts pas encore construits — fusion de joueurs invités, état ouvert/fermé des votes). Fait à la place : page "Matchs à vérifier" limitée aux matchs incomplets/scores incohérents, dérivée de la checklist de complétude

## Lot 5 — Calendrier et modèles

- Modèles de matchs nommés et réutilisables (ex. « vendredi soir à Charenton », « match extérieur », « tournoi », « match à cinq »), mémorisant terrain/horaire/RDV/type/matériel habituel, indépendamment d'un adversaire précis — fait à la place : « Rejouer contre cet adversaire » qui duplique un match passé (même terrain/horaires/type) et reprend en option présents/composition/matériel/capitaine. Couvre le cas le plus fréquent (le même adversaire) mais pas un modèle générique sans adversaire

## Lot 6 — Partage et renforts

- QR codes (accès à l'équipe, prochain match, profil public, appel à renfort) — dépendent en partie du "profil public" pas encore construit (voir Lot 11) ; les liens WhatsApp/copier-coller couvrent déjà le partage sans QR pour l'instant
- Système générique de "liens publics temporaires" réutilisable au-delà de l'appel à renfort (ex. pour un futur profil public) — fait à la place : le mécanisme token/expiration/révocation est scopé uniquement aux appels à renfort, pas encore extrait en système générique

## Lot 7 — Statistiques enrichies

- Filtres interactifs génériques (saison/mois/année/5 derniers matchs/domicile-extérieur/jour de la semaine) — fait à la place : des répartitions fixes directement affichées sur la page Tendances (bilan domicile/extérieur, bilan par jour, bilan par mois), pas de contrôle de filtre universel
- Statistiques gardien (matchs comme gardien, clean sheets, buts encaissés, victoires, moyenne encaissée) — nécessite d'abord une UI pour marquer qui a joué gardien par match (la colonne `match_players.goalkeeper` existe déjà en base mais rien ne l'alimente), pas encore construite

## Lot 8 — Mémoire du club

- **Upload direct de photos** (frise, souvenir aléatoire, historique des maillots) — aucune infra Supabase Storage n'existe encore dans l'appli ; fait à la place : un lien externe optionnel (URL d'une photo hébergée ailleurs) sur les maillots uniquement, même choix que pour les adresses de terrain au Lot 2
- **Mur des citations lié à un match précis** (sélecteur de match) — fait à la place : un champ de contexte libre (« après la victoire 3-1 vs Ivry ») en plus du lien optionnel vers un joueur, pour éviter un sélecteur de match dédié
- **Trophées de fin de saison** dans la frise — le concept de trophée de saison n'existe pas encore (c'est le Lot 9) ; la frise couvre à la place les intronisations au Hall of Fame comme moments cérémoniels, la première victoire, le premier triplé, la plus grosse victoire et les fins de saison
- **Numéros retirés** en tant que fonction dédiée — fait à la place : un champ optionnel sur les entrées du Hall of Fame plutôt qu'une table séparée, la roadmap la qualifie elle-même de facultative

## Lot 9 — Fun et engagement

- **Case "gardien homme du match" du bingo de saison** — nécessite de savoir qui a joué gardien par match (`match_players.goalkeeper` existe en base mais rien ne l'alimente, même gap que noté au Lot 7) ; bingo livré avec 5 cases sur 6 en attendant
- **Réactions emoji** — aucun système de réaction/commentaire n'existe dans l'appli (sur quoi réagir precisément — un match ? un but ? — n'est pas non plus précisé dans la roadmap) ; entièrement écarté pour l'instant
- **Défis collectifs personnalisables** — fait à la place : 4 défis fixes calculés à la volée (3 victoires consécutives, 5 matchs sans carton, 10 buteurs différents, présence collective moyenne), pas de créateur de défi admin avec cible ajustable
- **Joueur du mois : cycle formel (ouverture/clôture, annonce du gagnant)** — fait à la place : un tally toujours ouvert, recalculé en direct depuis les votes du mois en cours, sans étape de clôture ni notification
- **Trophées de fin de saison : vote d'équipe** — la roadmap ne précise le mécanisme de vote que pour le joueur du mois ; fait à la place : attribution manuelle par l'admin (même logique que le Hall of Fame du Lot 8), pas de vote formalisé pour ces catégories

---

_Lots 10 à 12 : pas encore commencés — voir `ROADMAP_Charenton.md` pour le détail, rien n'y a encore été écarté puisque rien n'a été construit._
