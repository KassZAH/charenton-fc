-- Roadmap V3, Lot 16 — concurrence et idempotence de la saisie en direct.
--
-- ⚠️ Macro-release A : appliquée uniquement au projet Supabase isolé tant
-- que la macro-release n'est pas validée en production.
--
-- Protection contre le double-clic/double soumission sur "+ But"/"+ Carton"
-- pendant le live : chaque formulaire embarque une clé générée côté serveur
-- au rendu (idempotency_key), rejouée à l'identique si le même clic est
-- envoyé deux fois. Index unique partiel (jamais sur les lignes historiques
-- déjà existantes, qui n'ont pas de clé) — une seconde insertion avec la
-- même clé échoue avec une violation d'unicité, traitée côté application
-- comme un succès silencieux plutôt qu'une erreur.

alter table public.goals add column idempotency_key uuid;
alter table public.cards add column idempotency_key uuid;

create unique index goals_match_idempotency_key_idx
  on public.goals (match_id, idempotency_key)
  where idempotency_key is not null;

create unique index cards_match_idempotency_key_idx
  on public.cards (match_id, idempotency_key)
  where idempotency_key is not null;
