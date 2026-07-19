# Intégration du classement FLA (roadmap V3, Lot 11.5)

## 1. Synthèse de l'autorisation

Le propriétaire du projet Charenton FC (titulaire de l'autorisation)
**déclare** avoir obtenu l'autorisation de la FLA (Football Loisir
Amateur) pour :

| Élément | Statut déclaré |
|---|---|
| Autorisation FLA obtenue | **Oui** |
| Reproduction du classement | Autorisée |
| Affichage des statistiques associées | Autorisé |
| Synchronisation automatisée | Autorisée |
| Attribution et lien vers la source officielle | **Requis** — toujours affichés avec le classement |
| Usage du logo FLA | **Interdit** tant que son usage n'est pas explicitement confirmé séparément |
| Limites de fréquence | Aucune limite formelle communiquée — une limite technique prudente est appliquée côté application par précaution (voir §9 du cahier des charges : synchronisation manuelle espacée d'au moins 15 minutes) |

Cette page documente une **synthèse déclarative**, pas une pièce
juridique : aucune correspondance privée, aucun e-mail, aucune donnée
personnelle n'est reproduit ici ou ailleurs dans le dépôt. Le périmètre
ci-dessus est celui qui gouverne l'implémentation technique de ce lot ;
aucune nouvelle validation juridique n'est redemandée dans ce document.

## 2. Audit technique de la source FLA

### Ordre de préférence suivi

1. **API ou endpoint JSON public** — recherché, absent.
2. **Endpoint structuré appelé par le site** — recherché, absent (page
   rendue entièrement côté serveur, aucune donnée embarquée type
   `__NEXT_DATA__`/`__NUXT__`/`window.__*`, aucun attribut `data-*`
   applicatif au niveau de la page).
3. **Données incluses directement dans le HTML** — c'est le cas : la page
   est un template HTML statique dont le tableau est rempli côté serveur.
4. **Parsing HTML côté serveur** — méthode retenue, seule disponible.

### Page cible

`https://football-loisir-amateur.fr/championships/{id}/rankings?season={n}`
— confirmé fonctionnel pour `id=13`, `season=2` (HTTP 200, ~61 Ko, pas de
redirection). Nom exact de la compétition affiché : **« Foot à 11 -
Week-end - 2ème division »**. Saison affichée par défaut : 2025-2026, avec
bascule vers 2026-2027 — la saison externe `2` correspond à la saison
actuellement configurée sur le site.

### Structure HTML réelle (vérifiée, pas supposée)

En-tête de tableau (`<thead><tr><th>...`), 12 colonnes dans cet ordre
exact : **Position, Équipe, Points, Pénalité, J, G, N, P, BP, BC, Diff,
Forf.**

Chaque ligne d'équipe est un `<tr data-team-name="NOM DE L'ÉQUIPE" class="...">`
— l'attribut `data-team-name` porte directement le nom de l'équipe,
utilisé en priorité pour l'extraction (plus robuste qu'une lecture du
texte du lien imbriqué, conservé en repli). Dans l'ordre des `<td>` :

1. Position — texte du dernier `<span>` du premier `<td>` (le premier
   `<span>`, optionnel, ne contient qu'une médaille emoji 🥇🥈🥉 pour le
   top 3, à ignorer).
2. Équipe — texte du lien `<a href="https://football-loisir-amateur.fr/teams/{id}">`.
3. Points — texte du `<span>` à l'intérieur d'un badge circulaire.
4. Pénalité — soit `-` (aucune pénalité, à traiter comme `null`), soit un
   nombre.
5. J (joués), 6. G (gagnés), 7. N (nuls), 8. P (perdus), 9. BP (buts
   pour), 10. BC (buts contre) — texte brut du `<td>`, nombre entier.
11. Diff — texte du `<span>` interne, préfixé `+` ou `-`.
12. Forf. — soit `-` (aucun forfait, `null`), soit un nombre réel
    (y compris `0`, qui est une vraie valeur ici, contrairement à
    Pénalité où `-` signifie l'absence de valeur).

### Comportement quand le classement est vide

Vérifié en direct sur l'URL cible exacte (championnat 13, saison 2) : le
`<tbody>` contient une unique ligne `<td colspan="12">` avec le texte
exact **« Aucune équipe dans ce championnat pour cette saison »**. C'est
l'ancre textuelle utilisée pour distinguer un classement **vraiment vide**
(réponse valide, aucune ligne) d'une page saisie invalide ou d'une erreur
réseau — jamais confondu, jamais transformé en zéros inventés.

Contre-exemple observé (championnat 1, saison 2) : 39 équipes réellement
inscrites, mais toutes à 0 partout (saison pas encore commencée) — cas
distinct d'un tableau sans aucune ligne, les deux devant afficher un état
« vide » côté application sans jamais fabriquer de faux zéros pour la
compétition ciblée elle-même (championnat 13).

### Stabilité supposée et limites identifiées

- Site simple, rendu serveur classique (probablement Laravel/Blade —
  classes Tailwind, pas d'indice de framework JS côté client) : la
  structure HTML est **raisonnablement stable** dans le temps pour ce
  type de site, mais reste un couplage fragile par nature (un
  changement de template casse le parseur sans préavis) — d'où
  `invalid_payload` comme statut dédié plutôt qu'un crash silencieux.
- Pas de `robots.txt` consulté programmatiquement dans ce lot (à faire
  avant toute activation en production réelle) ; l'usage reste
  strictement limité à l'URL configurée, jamais une exploration large du
  site.
- Aucune authentification requise pour consulter cette page (page
  publique) — aucun contournement d'authentification n'est donc en jeu.
- Aucune donnée personnelle dans la réponse : uniquement des noms
  d'équipes et des statistiques sportives agrégées.

## 3. Méthode retenue

Parsing HTML côté serveur exclusivement (`FlaStandingsProvider`), jamais
de navigateur automatisé (pas de Playwright/Puppeteer), avec l'ensemble
des protections décrites dans le corps du code (`src/lib/fla/`) : domaine
strictement limité à `football-loisir-amateur.fr`, URL construite
uniquement depuis les identifiants contrôlés (`championnat=13`,
`saison=2`), redirections vers un autre domaine refusées, timeout court,
taille de réponse plafonnée, aucune URL libre acceptée depuis le
navigateur.
