-- Roadmap V3, Macro-release B (Lot 19) — Restrictions temporaires et
-- historique de disponibilité.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé (charenton-fc-lot7-test,
-- cimbymuifzooxrnenznd) tant que la macro-release n'est pas validée en
-- production.
--
-- Distincte de injuries (Lot 1) : une restriction n'est jamais un dossier
-- médical, seulement un cadre de reprise ("pas gardien", "pas de sprint",
-- "temps de jeu limité"...). Elle alerte le coach dans la composition sans
-- jamais bloquer une sélection. Comme injuries, RLS activée sans policy :
-- tout accès passe par supabaseAdmin (service_role) côté serveur, jamais par
-- anon/authenticated directement.

create table public.player_restrictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  starts_at date not null default current_date,
  ends_at date,
  status text not null default 'active',
  restriction_types text[] not null,
  comment text,
  visibility text not null default 'coaches',
  created_at timestamptz not null default now(),
  created_by_player_id uuid references public.players(id) on delete set null,
  ended_at timestamptz,
  constraint player_restrictions_status_check check (status in ('active', 'ended')),
  constraint player_restrictions_visibility_check check (visibility in ('private', 'coaches', 'team')),
  constraint player_restrictions_types_not_empty check (array_length(restriction_types, 1) > 0),
  constraint player_restrictions_types_valid check (
    restriction_types <@ array[
      'no_goalkeeper', 'no_defence', 'no_attack', 'no_intense_running',
      'limited_play_time', 'progressive_return', 'custom'
    ]::text[]
  ),
  constraint player_restrictions_dates_check check (ends_at is null or ends_at >= starts_at)
);

create index player_restrictions_player_id_idx on public.player_restrictions (player_id);
-- Une seule restriction active à la fois par joueur : au-delà du confort du coach dans la
-- composition, une deuxième restriction active en parallèle rendrait "ended_at"/l'historique
-- ambigus sur laquelle a été clôturée.
create unique index player_restrictions_one_active_per_player on public.player_restrictions (player_id) where status = 'active';

alter table public.player_restrictions enable row level security;
