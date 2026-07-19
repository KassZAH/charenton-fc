-- Roadmap V3, Lot 11.5 — Classement FLA dans les statistiques et informations
-- des adversaires.
--
-- ⚠️ Cette migration n'est appliquée QUE sur le projet Supabase isolé
-- (charenton-fc-lot7-test, cimbymuifzooxrnenznd), jamais sur le projet
-- partagé sans validation manuelle explicite.
--
-- Modèle minimal et extensible pour des classements de compétitions
-- externes (FLA aujourd'hui, potentiellement d'autres fournisseurs plus
-- tard — d'où "provider" en texte libre plutôt qu'un enum figé).

create table public.external_competitions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_championship_id text not null,
  external_season_id text not null,
  internal_season_id uuid references public.seasons(id),
  competition_name text,
  internal_team_name text not null,
  -- Construite uniquement côté serveur à partir d'identifiants contrôlés — jamais une URL libre.
  -- La contrainte de domaine ci-dessous est une défense en profondeur, pas la seule garantie
  -- (l'application ne construit jamais cette valeur autrement que par un gabarit fixe).
  source_url text not null,
  sync_enabled boolean not null default true,
  last_sync_status text,
  last_synced_at timestamptz,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_championship_id, external_season_id),
  constraint external_competitions_source_url_domain
    check (source_url like 'https://football-loisir-amateur.fr/%'),
  constraint external_competitions_status_check
    check (last_sync_status is null or last_sync_status in ('success', 'empty', 'unavailable', 'invalid_payload', 'disabled'))
);

comment on table public.external_competitions is
  'Une ligne par compétition externe suivie (Lot 11.5). Le classement associé est dans external_standings.';

create table public.external_standings (
  id uuid primary key default gen_random_uuid(),
  external_competition_id uuid not null references public.external_competitions(id) on delete cascade,
  external_team_id text,
  team_name text not null,
  normalized_team_name text not null,
  -- null = information absente (jamais remplacé par 0 — voir backup-integrity.ts pour le même principe
  -- appliqué aux checksums : ne jamais confondre "pas de valeur" et "valeur nulle réelle").
  position integer,
  played integer,
  wins integer,
  draws integer,
  losses integer,
  goals_for integer,
  goals_against integer,
  goal_difference integer,
  points integer,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_competition_id, normalized_team_name),
  constraint external_standings_position_check check (position is null or position > 0),
  constraint external_standings_played_check check (played is null or played >= 0),
  constraint external_standings_wins_check check (wins is null or wins >= 0),
  constraint external_standings_draws_check check (draws is null or draws >= 0),
  constraint external_standings_losses_check check (losses is null or losses >= 0),
  constraint external_standings_goals_for_check check (goals_for is null or goals_for >= 0),
  constraint external_standings_goals_against_check check (goals_against is null or goals_against >= 0),
  constraint external_standings_points_check check (points is null or points >= 0)
  -- goal_difference : aucune contrainte de signe, peut légitimement être négatif.
);

comment on table public.external_standings is
  'Dernier classement connu pour une compétition externe. Remplacé uniquement après une synchronisation réussie (status=success) — jamais vidé sur empty/unavailable/invalid_payload, qui conservent le cache précédent.';

create table public.opponent_external_mappings (
  id uuid primary key default gen_random_uuid(),
  external_competition_id uuid not null references public.external_competitions(id) on delete cascade,
  app_opponent_name text not null,
  normalized_app_opponent_name text not null,
  external_team_id text,
  external_team_name text,
  mapping_status text not null check (mapping_status in ('automatic', 'confirmed', 'ambiguous', 'unmatched', 'disabled')),
  confirmed_by_player_id uuid references public.players(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_competition_id, normalized_app_opponent_name)
);

comment on table public.opponent_external_mappings is
  'Association entre le nom d''un adversaire tel que saisi dans matches/opponents et une équipe du classement externe. Ne modifie jamais les noms historiques des adversaires dans les matchs.';

create index external_standings_competition_idx on public.external_standings(external_competition_id);
create index opponent_external_mappings_competition_idx on public.opponent_external_mappings(external_competition_id);
