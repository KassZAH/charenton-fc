-- Roadmap V3, Lot 14 — cycle de vie d'un match (modèle validé, V2 §5.1).
--
-- ⚠️ Macro-release A : appliquée uniquement au projet Supabase isolé tant
-- que la macro-release n'est pas validée en production. Sur le projet
-- partagé, les 30 matchs réels sont tous "completed" (vérifié en lecture
-- avant d'écrire cette migration) — aucun n'est concerné par le backfill
-- completion_status ci-dessous autrement que "validated".
--
-- Découverte pendant l'écriture de cette migration : matches_status_check
-- existe en réalité depuis la toute première migration baseline et
-- autorisait déjà draft/scheduled/completed/cancelled/postponed — seul
-- 'live' manquait. La note antérieure de ROADMAP_STATUS.md ("aucune
-- contrainte ne limite les valeurs possibles") était inexacte ; ce lot est
-- donc surtout une extension applicative d'une flexibilité déjà présente en
-- base, pas une prise de risque de schéma.
--
-- Additive uniquement : aucune colonne existante modifiée, aucune donnée
-- historique réécrite au-delà du backfill explicite de completion_status.

alter table public.matches
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add column completion_status text not null default 'not_started',
  add column validated_at timestamptz,
  add column validated_by_player_id uuid references public.players(id);

-- Backfill : les matchs déjà "completed" avant ce lot sont considérés validés (ils ont déjà un
-- score et des statistiques associées) — jamais remis en question rétroactivement.
update public.matches set completion_status = 'validated' where status = 'completed';

-- matches_status_check existe déjà depuis la migration baseline (draft/scheduled/completed/
-- cancelled/postponed) — il manquait seulement 'live'. Remplacée plutôt que dupliquée.
alter table public.matches drop constraint matches_status_check;
alter table public.matches
  add constraint matches_status_check
    check (status in ('draft', 'scheduled', 'live', 'completed', 'cancelled', 'postponed'));

alter table public.matches
  add constraint matches_completion_status_check
    check (completion_status in ('not_started', 'incomplete', 'under_review', 'validated'));

comment on column public.matches.completion_status is
  'Distinct de matches.status : status décrit le déroulement (a-t-il eu lieu), completion_status décrit la fiabilité des données une fois joué (voir Lot 14, roadmap V3).';
