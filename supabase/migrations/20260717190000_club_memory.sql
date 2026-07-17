-- Lot 8 — Mémoire du club
--
-- Pas de stockage de photos (aucune infra Supabase Storage dans l'appli à ce jour,
-- même choix qu'au Lot 2 pour les terrains) : les entrées "maillots" acceptent une
-- simple URL externe optionnelle plutôt qu'un upload.
-- L'anecdote du "souvenir aléatoire" réutilise matches.description (déjà existant).

alter table public.team_settings
  add column founded_date date,
  add column founding_note text;

create table public.hall_of_fame_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  display_name text,
  category text not null,
  description text,
  retired_number integer,
  inducted_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint hall_of_fame_entries_category_check check (
    category in ('fondateur', 'capitaine_emblematique', 'meilleur_buteur_historique', 'legende_vestiaire', 'autre')
  ),
  constraint hall_of_fame_entries_name_check check (player_id is not null or display_name is not null)
);

alter table public.hall_of_fame_entries enable row level security;

create table public.club_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_text text not null,
  author_label text,
  player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.club_quotes enable row level security;

create table public.jersey_history_entries (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.jersey_history_entries enable row level security;
