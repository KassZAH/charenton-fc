-- Migration de référence, générée par introspection du schéma existant
-- (pas de Docker/pg_dump disponible localement — reconstruite via information_schema/pg_catalog
-- à travers l'API de gestion Supabase). Représente l'état du schéma au 2026-07-17.

create table public.audit_log (
  id uuid not null default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by_player_id uuid,
  changed_by_name text not null,
  restored_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table public.availability (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  player_id uuid not null,
  status text not null default 'no_response'::text,
  comment text,
  needs_ride boolean default false,
  can_drive boolean default false,
  available_seats integer default 0,
  goalkeeper_available boolean default false,
  will_be_late boolean default false,
  updated_at timestamp with time zone default now()
);

create table public.awards (
  id uuid not null default gen_random_uuid(),
  name text not null,
  emoji text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table public.cards (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  player_id uuid,
  card_type text not null,
  minute integer,
  comment text,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

create table public.dues (
  id uuid not null default gen_random_uuid(),
  season_id uuid not null,
  player_id uuid not null,
  amount_due numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.goals (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  scorer_player_id uuid,
  assist_player_id uuid,
  goal_type text default 'classique'::text,
  minute integer,
  is_unknown_scorer boolean default false,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

create table public.match_awards (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  award_id uuid not null,
  player_id uuid,
  assigned_directly boolean default true,
  created_at timestamp with time zone default now()
);

create table public.match_lineups (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  formation text not null,
  positions jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default now()
);

create table public.match_players (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  player_id uuid,
  was_present boolean not null default true,
  goalkeeper boolean not null default false,
  guest_name text,
  created_at timestamp with time zone default now()
);

create table public.matches (
  id uuid not null default gen_random_uuid(),
  season_id uuid,
  opponent_id uuid,
  match_date date not null,
  kickoff_time time without time zone,
  meeting_time time without time zone,
  location text,
  address text,
  maps_url text,
  match_type text default 'championnat'::text,
  home_or_away text,
  team_score integer,
  opponent_score integer,
  status text not null default 'scheduled'::text,
  description text,
  shirt text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

create table public.opponents (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

create table public.player_badges (
  id uuid not null default gen_random_uuid(),
  player_id uuid not null,
  badge_key text not null,
  match_id uuid,
  earned_at timestamp with time zone not null default now()
);

create table public.player_measurements (
  id uuid not null default gen_random_uuid(),
  player_id uuid not null,
  weight_kg numeric,
  height_cm numeric,
  recorded_at timestamp with time zone not null default now()
);

create table public.players (
  id uuid not null default gen_random_uuid(),
  first_name text not null,
  last_name text,
  nickname text,
  shirt_number integer,
  primary_position text,
  strong_foot text,
  quote text,
  role text not null default 'player'::text,
  pin_hash text,
  is_guest boolean not null default false,
  status text not null default 'active'::text,
  archived_at timestamp with time zone,
  share_measurements boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.seasons (
  id uuid not null default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  created_at timestamp with time zone default now()
);

create table public.team_settings (
  id integer not null default 1,
  name text not null default 'Charenton FC'::text,
  short_name text not null default 'CFC'::text,
  primary_color text not null default '#1c3762'::text,
  gold_color text not null default '#e8b53a'::text,
  access_code text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.votes (
  id uuid not null default gen_random_uuid(),
  match_id uuid not null,
  award_id uuid not null,
  voter_player_id uuid not null,
  voted_player_id uuid,
  created_at timestamp with time zone default now()
);

-- Clés primaires
alter table public.audit_log add constraint audit_log_pkey PRIMARY KEY (id);
alter table public.availability add constraint availability_pkey PRIMARY KEY (id);
alter table public.awards add constraint awards_pkey PRIMARY KEY (id);
alter table public.cards add constraint cards_pkey PRIMARY KEY (id);
alter table public.dues add constraint dues_pkey PRIMARY KEY (id);
alter table public.goals add constraint goals_pkey PRIMARY KEY (id);
alter table public.match_awards add constraint match_awards_pkey PRIMARY KEY (id);
alter table public.match_lineups add constraint match_lineups_pkey PRIMARY KEY (id);
alter table public.match_players add constraint match_players_pkey PRIMARY KEY (id);
alter table public.matches add constraint matches_pkey PRIMARY KEY (id);
alter table public.opponents add constraint opponents_pkey PRIMARY KEY (id);
alter table public.player_badges add constraint player_badges_pkey PRIMARY KEY (id);
alter table public.player_measurements add constraint player_measurements_pkey PRIMARY KEY (id);
alter table public.players add constraint players_pkey PRIMARY KEY (id);
alter table public.seasons add constraint seasons_pkey PRIMARY KEY (id);
alter table public.team_settings add constraint team_settings_pkey PRIMARY KEY (id);
alter table public.votes add constraint votes_pkey PRIMARY KEY (id);

-- Contraintes uniques
alter table public.availability add constraint availability_match_id_player_id_key UNIQUE (match_id, player_id);
alter table public.dues add constraint dues_player_id_season_id_key UNIQUE (player_id, season_id);
alter table public.match_lineups add constraint match_lineups_match_id_key UNIQUE (match_id);
alter table public.match_players add constraint match_players_match_id_player_id_key UNIQUE (match_id, player_id);
alter table public.player_badges add constraint player_badges_player_id_badge_key_key UNIQUE (player_id, badge_key);
alter table public.votes add constraint votes_match_id_award_id_voter_player_id_key UNIQUE (match_id, award_id, voter_player_id);

-- Contraintes de vérification
alter table public.audit_log add constraint audit_log_action_check CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text])));
alter table public.availability add constraint availability_status_check CHECK ((status = ANY (ARRAY['present'::text, 'uncertain'::text, 'absent'::text, 'injured'::text, 'no_response'::text])));
alter table public.cards add constraint cards_card_type_check CHECK ((card_type = ANY (ARRAY['yellow'::text, 'red'::text])));
alter table public.goals add constraint goals_goal_type_check CHECK ((goal_type = ANY (ARRAY['classique'::text, 'penalty'::text, 'coup_franc'::text, 'csc'::text])));
alter table public.matches add constraint matches_home_or_away_check CHECK ((home_or_away = ANY (ARRAY['home'::text, 'away'::text])));
alter table public.matches add constraint matches_match_type_check CHECK ((match_type = ANY (ARRAY['amical'::text, 'championnat'::text, 'tournoi'::text, 'autre'::text])));
alter table public.matches add constraint matches_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text, 'postponed'::text, 'draft'::text])));
alter table public.players add constraint players_role_check CHECK ((role = ANY (ARRAY['player'::text, 'admin'::text, 'coach'::text])));
alter table public.players add constraint players_status_check CHECK ((status = ANY (ARRAY['active'::text, 'injured'::text, 'former'::text, 'archived'::text])));
alter table public.team_settings add constraint one_row CHECK ((id = 1));

-- Clés étrangères
alter table public.audit_log add constraint audit_log_changed_by_player_id_fkey FOREIGN KEY (changed_by_player_id) REFERENCES players(id) ON DELETE SET NULL;
alter table public.availability add constraint availability_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.availability add constraint availability_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.cards add constraint cards_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.cards add constraint cards_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;
alter table public.dues add constraint dues_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;
alter table public.dues add constraint dues_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.goals add constraint goals_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.goals add constraint goals_assist_player_id_fkey FOREIGN KEY (assist_player_id) REFERENCES players(id) ON DELETE SET NULL;
alter table public.goals add constraint goals_scorer_player_id_fkey FOREIGN KEY (scorer_player_id) REFERENCES players(id) ON DELETE SET NULL;
alter table public.match_awards add constraint match_awards_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.match_awards add constraint match_awards_award_id_fkey FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE;
alter table public.match_awards add constraint match_awards_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;
alter table public.match_lineups add constraint match_lineups_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.match_players add constraint match_players_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.match_players add constraint match_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES opponents(id) ON DELETE SET NULL;
alter table public.matches add constraint matches_season_id_fkey FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL;
alter table public.player_badges add constraint player_badges_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.player_badges add constraint player_badges_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;
alter table public.player_measurements add constraint player_measurements_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.votes add constraint votes_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.votes add constraint votes_award_id_fkey FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE;
alter table public.votes add constraint votes_voted_player_id_fkey FOREIGN KEY (voted_player_id) REFERENCES players(id) ON DELETE SET NULL;
alter table public.votes add constraint votes_voter_player_id_fkey FOREIGN KEY (voter_player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Index
CREATE INDEX audit_log_created_at_idx ON public.audit_log USING btree (created_at DESC);
CREATE INDEX player_measurements_player_id_idx ON public.player_measurements USING btree (player_id);

-- Row Level Security (aucune policy publique définie à ce jour)
alter table public.audit_log enable row level security;
alter table public.availability enable row level security;
alter table public.awards enable row level security;
alter table public.cards enable row level security;
alter table public.dues enable row level security;
alter table public.goals enable row level security;
alter table public.match_awards enable row level security;
alter table public.match_lineups enable row level security;
alter table public.match_players enable row level security;
alter table public.matches enable row level security;
alter table public.opponents enable row level security;
alter table public.player_badges enable row level security;
alter table public.player_measurements enable row level security;
alter table public.players enable row level security;
alter table public.seasons enable row level security;
alter table public.team_settings enable row level security;
alter table public.votes enable row level security;

