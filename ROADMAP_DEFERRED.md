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

---

_Lots 4 à 12 : pas encore commencés — voir `ROADMAP_Charenton.md` pour le détail, rien n'y a encore été écarté puisque rien n'a été construit._
