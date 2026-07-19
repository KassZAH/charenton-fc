-- Roadmap V3, Macro-release B (Lot 19) — correctif : player_restrictions_types_not_empty
-- utilisait `array_length(restriction_types, 1) > 0`. Pour un tableau vide, array_length()
-- renvoie NULL (pas 0), et NULL > 0 vaut NULL — une contrainte CHECK n'échoue que sur FALSE,
-- jamais sur NULL, donc un tableau vide passait silencieusement (trouvé par le test
-- d'intégration player-restrictions.integration.test.ts avant tout déploiement, jamais en
-- production). Remplacé par cardinality(), qui renvoie 0 (jamais NULL) pour un tableau vide.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé tant que la macro-release n'est pas validée
-- en production.

alter table public.player_restrictions drop constraint player_restrictions_types_not_empty;
alter table public.player_restrictions add constraint player_restrictions_types_not_empty check (cardinality(restriction_types) > 0);
