# STATE — Macro-release B (Organisation d'équipe)

Branche : macro-b-team-organization
Objectif : Lots 19 à 24 — TERMINÉ. Dataset de démonstration enrichi — TERMINÉ. En attente de
validation utilisateur de la preview.

## Lot courant
Aucun — en attente de validation utilisateur puis autorisation de production. Macro C non commencée.

## Commits (les plus récents)
- 1359ae4 — dataset de démonstration riche (seed-demo.js + seeded-random.js + test dédié)
- 41f0cd4 — fix : groupe convoqué du scénario principal laissé en brouillon (sinon suggestion de rotation masquée)

## Dataset de démonstration
- `npm run seed:isolated` — minimal, technique, inchangé (utilisé par tous les tests).
- `npm run seed:isolated:demo` — riche, déterministe (graine fixe, mulberry32, jamais Math.random()),
  14 comptes / 20 matchs / 4 terrains / 3 modèles / covoiturage / matériel / checklist / restrictions.
  Idempotent (vérifié par 2 exécutions consécutives + test dédié).

## Gate complet (dernière exécution après ajout du dataset démo)
tsc ✓ | lint ✓ | unit ✓ (163) | integration ✓ (131, dont 13 nouvelles pour le seed démo) |
e2e ✓ (50, mobile+desktop) | build ✓ | verify:deployment ✓ 14/14

## Preview actuelle
https://charenton-neqr4bu2x-memesiro.vercel.app — projet isolé confirmé, seed démo appliqué.

## Blocages
Aucun.

## Prochaine action
Attendre la validation utilisateur de la preview (dataset démo). Après validation : autorisation
de production unique, puis vagues internes (schéma additif → backend → UI → doc), backup protégé
avant migration sur le projet partagé.
