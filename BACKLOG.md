# Charenton FC — État de l'appli & backlog

_Dernière mise à jour : 2026-07-17_

## Déjà implémenté

### Connexion
- Sélection du nom + code PIN (4 chiffres joueur, 6 chiffres admin/coach)
- Session persistante, rôles joueur / coach / admin

### Accueil
- Prochain match en avant + réponse de présence rapide (Présent/Incertain/Absent/Blessé)
- Bannière "sans-réponse" pour les admins + relance WhatsApp
- Stats perso de la saison + phrase rigolote générée selon les perfs

### Matchs
- Liste à venir / terminés, création (unitaire ou en lot), modification, suppression
- Réponse de présence par match + vue admin de toute l'équipe (modifiable joueur par joueur)
- Feuille de match : confirmer qui a vraiment joué (base des stats de présence)
- Buts (buteur, passeur, minute) et cartons (jaune/rouge, minute, commentaire) : ajout/suppression
- Votes de récompenses par match (Homme du match, Mur du match, etc.), résultats agrégés
- Feuille tactique : formation (4-4-2, 4-3-3, 3-5-2, 4-2-3-1) + placement des joueurs sur le terrain
- Score : saisie et correction
- Partage WhatsApp : convocation, relance sans-réponse, résultat
- Export calendrier .ics (par match ou tous les matchs à venir)

### Équipe
- Liste des joueurs actifs + archivés, ajout/modification/archivage (admin)
- Fiche joueur : stats de base + avancées (taux de présence, taux de victoire, doublés/triplés...), récompenses gagnées, badges, mesures (poids/taille avec évolution), historique des matchs
- Carte joueur partageable (image)
- Comparateur 2 joueurs côte à côte
- Badges automatiques (premier but, 10 matchs, séries, etc.)

### Stats
- Stats d'équipe globales (V/N/D, buts, cartons), séries et highlights
- Classements : buteurs, passeurs, présences, cartons, par récompense

### Records
- Records saison en cours vs historique du club (buteur, passeur, présence, doublés, plus grosse victoire, etc.)

### Bilan de saison
- Stats + records de la saison, partage WhatsApp

### Cotisations (admin)
- Montant dû par joueur (individuel ou en lot), montant payé, statuts payé/partiel/non payé

### Historique (admin)
- Journal des 30 dernières modifications sensibles (scores, buts, cartons, fiches), avec restauration

### Profil
- Modification de ses infos, suivi privé/partagé du poids/taille
- Réinitialisation complète de la saison (compte spécifique uniquement)

### Aide
- Mode d'emploi complet, section dédiée admin

### Technique
- PWA installable sur l'écran d'accueil
- Design "Le Stade" (thème sombre navy/or façon stade) sur toute l'appli

---

## Backlog — prochaines implémentations

### 🔥 Très intéressant
- **Covoiturage** — sur la fiche du match, chacun indique s'il a une voiture (+ places dispo) ou a besoin d'être emmené
- **Notifications push** (épic complet, fusion de plusieurs idées) :
  - annonce d'un nouveau match créé
  - rappel à J-4 pour les joueurs sans réponse de présence
  - résultat du match posté
  - (nécessite service worker + clés push, plus gros chantier que le reste)
- **Qui apporte quoi** — liste de matériel (ballons, chasubles, trousse de secours) assignée à tour de rôle par match
- **Relance automatique des cotisations impayées** — même principe que la relance sans-réponse, pour les retards de paiement
- **Heure de RDV distincte du coup d'envoi** — ex. "RDV 30 min avant", avec rappel dédié
- **Lien Google Maps** — accès direct au lieu du match depuis la fiche, plus pratique qu'une adresse texte

### 👍 Intéressant / Cool
- **Annonces automatiques de jalons** — message auto-généré quand un joueur passe un cap (50e but, 20e match...)
- **Debrief auto-généré après une défaite** — petit texte humoristique à partager, façon funny-line existante
- **Objectif de saison** — à deux niveaux : un objectif d'équipe + un objectif perso par joueur, chacun avec sa jauge de progression
- **Anniversaires** — message auto le jour J ; nécessite d'ajouter un champ date de naissance au profil (n'existe pas encore)
- **Trophées de fin de saison** — élection annuelle par catégories fun (plus grand fail, meilleure ambiance, révélation de la saison), même principe que les votes de récompenses mais à l'échelle de la saison
- **Reçu de cotisation** — génère un petit justificatif pour un joueur qui a payé
- **Profil joueur public** — lien en lecture seule vers la fiche d'un joueur, partageable à la famille sans compte
- **Joueur du mois** — élection automatique basée sur les stats du mois (buts, présence), annoncée comme les jalons

### 🤔 À voir
- **Indicateur de forme** — badge "en feu" sur la fiche joueur selon les buts/présences récents
- **Classement du championnat** — en attente d'avoir le site/l'URL de la ligue ; probablement un lien ou un scraping simple plutôt qu'une saisie manuelle

### 💡 Proposées mais pas encore évaluées
- Notes tactiques adversaire — l'admin/coach note en privé les points forts/faibles observés avant un match contre une équipe déjà rencontrée
- Gestion des maillots — suivi des numéros disponibles/attribués et du linge d'équipe
- Capitanat tournant — désigner un capitaine par match, affiché sur la fiche
- Comparaison saison N vs N-1 — bilan d'une saison à l'autre (victoires, buts, effectif)
- Fiche joueur "carrière au club" — historique figé et consultable quand un joueur quitte l'équipe

### ❌ Écartées pour l'instant (bof)
- Billet de match partageable (image façon souche de stade)
- Best XI de la saison généré automatiquement
- Mini courbe de progression (sparkline) sur la fiche joueur
- Entraînements distincts des matchs
- Export du bilan de saison en PDF/image
- Sondage multi-dates pour fixer un match
- Alerte météo du jour de match
- Statut "en route" le jour du match
- Couleur du jour (tenue à porter)
- Annuaire équipe (contacts directs)
- Mode hors-ligne
- Fiche adversaire (historique des confrontations)
- Pronostics de match
- Sondage sortie d'équipe / team building
