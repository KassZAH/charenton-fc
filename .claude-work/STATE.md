# STATE — Macro-release B (Organisation d'équipe)

Branche : macro-b-team-organization
Objectif : Lots 19 à 24 — TERMINÉ, en attente de validation utilisateur de la preview.

## Lot courant
Aucun — macro-release complète, en attente de validation utilisateur puis autorisation de production. Macro C non commencée.

## Commits
- 8467f78 — Lot 19 (restrictions)
- d905644 — Lot 20 (deadlines de réponse)
- 741eedc — Lot 21 (rotation équitable + fiabilité)
- 73cdce4 — Lot 22 (terrains + modèles)
- 8314d83 — Lot 23 (covoiturage avec affectations)
- deb410c — Lot 24 (matériel + capitaine + checklist)
- 8eb2fcb — fix reset-and-seed (checklist_templates jamais effacé)
- 3756c24 — e2e central + fix venues/match_templates jamais effacés + fix RestrictionPanel Invalid Date

## Migrations (isolé cimbymuifzooxrnenznd uniquement, poussées via `npx supabase db push --linked`)
9 migrations : player_restrictions (+backup+fix CHECK), response_deadline, venues_and_match_templates (+backup),
carpool_assignments (+backup), equipment_status_and_checklist (+backup).

## Gate complet (dernière exécution)
- tsc ✓ | lint ✓ | unit ✓ (163 passed) | integration ✓ (118 passed) | e2e ✓ (50 passed, mobile+desktop) | build ✓
- verify:deployment ✓ 14/14 sur preview https://charenton-lrltoc6mz-memesiro.vercel.app (isolé confirmé)

## Blocages
Aucun.

## Prochaine action
Attendre la validation utilisateur unique de la preview consolidée. Après validation : autorisation de production
unique, puis vagues internes (schéma additif → backend → UI → doc), backup protégé avant migration sur le
projet partagé.
