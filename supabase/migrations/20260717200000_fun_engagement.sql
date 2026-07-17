-- Lot 9 — Fun et engagement

-- Récompense ponctuelle : une récompense peut être scopée à un seul match.
-- match_id null = récompense globale, disponible sur tous les matchs (comportement actuel).
alter table public.awards
  add column match_id uuid references public.matches(id) on delete cascade;

create index awards_match_id_idx on public.awards (match_id) where match_id is not null;

-- Joueur du mois : candidats calculés à la volée (présence, victoires, buts, passes,
-- récompenses, cartons), un vote par joueur et par mois civil.
create table public.monthly_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null,
  voter_player_id uuid not null references public.players(id) on delete cascade,
  voted_player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint monthly_mvp_votes_month_check check (month between 1 and 12),
  constraint monthly_mvp_votes_unique unique (year, month, voter_player_id)
);

alter table public.monthly_mvp_votes enable row level security;

-- Trophées de fin de saison : intronisation manuelle par l'admin (catégories subjectives,
-- pas de vote formalisé — même logique que le Hall of Fame du Lot 8).
create table public.season_trophies (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category text not null,
  player_id uuid references public.players(id) on delete set null,
  display_name text,
  description text,
  awarded_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint season_trophies_category_check check (
    category in (
      'joueur_de_la_saison', 'meilleur_buteur', 'meilleur_passeur', 'mur_de_la_saison', 'revelation',
      'plus_grande_vendange', 'meilleure_ambiance', 'action_la_plus_improbable',
      'plus_grande_disparition_whatsapp', 'meilleur_moment_de_la_saison', 'autre'
    )
  ),
  constraint season_trophies_name_check check (player_id is not null or display_name is not null),
  constraint season_trophies_unique unique (season_id, category)
);

alter table public.season_trophies enable row level security;
