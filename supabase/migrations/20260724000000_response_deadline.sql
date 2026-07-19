-- Roadmap V3, Macro-release B (Lot 20) — Date limite et ponctualité des réponses.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé (charenton-fc-lot7-test,
-- cimbymuifzooxrnenznd) tant que la macro-release n'est pas validée en
-- production.
--
-- late_response est calculé et figé à la PREMIÈRE réponse du joueur (first_responded_at),
-- jamais recalculé si le joueur change ensuite d'avis (last_changed_at) : c'est la
-- ponctualité de la réponse initiale qui est mesurée, pas l'historique des changements.
-- Une correction posée par un admin (setAvailabilityAsAdmin) ne doit jamais alimenter ces
-- colonnes — seule la réponse du joueur lui-même compte pour sa propre ponctualité.

alter table public.matches add column response_deadline timestamptz;

alter table public.availability
  add column first_responded_at timestamptz,
  add column last_changed_at timestamptz,
  add column late_response boolean;
