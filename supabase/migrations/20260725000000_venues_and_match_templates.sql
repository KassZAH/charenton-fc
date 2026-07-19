-- Roadmap V3, Macro-release B (Lot 22) — Terrains et modèles génériques de matchs.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé (charenton-fc-lot7-test,
-- cimbymuifzooxrnenznd) tant que la macro-release n'est pas validée en
-- production.
--
-- venue_id est ajouté à matches EN PLUS des champs actuels (location/address/maps_url), jamais
-- à leur place : transition volontairement progressive (§7.1, roadmap V2), la sélection d'un
-- terrain ne fait que pré-remplir ces champs, qui restent modifiables localement par match.
-- match_templates ne mémorise jamais de présence/covoiturage/blessure/paiement (mémoire de
-- structure du match, jamais de son contenu humain).

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  maps_url text,
  parking_info text,
  changing_rooms_info text,
  access_code text,
  surface_type text,
  lighting boolean,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venues enable row level security;

alter table public.matches add column venue_id uuid references public.venues(id) on delete set null;
create index matches_venue_id_idx on public.matches (venue_id);

create table public.match_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue_id uuid references public.venues(id) on delete set null,
  kickoff_time time,
  -- Minutes avant le coup d'envoi, jamais une heure de RDV absolue (un modèle n'a pas de date) —
  -- convertie en meeting_time concret au moment de la génération d'un match.
  meeting_offset_minutes integer,
  match_type text,
  home_or_away text,
  max_players integer,
  default_equipment_items text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_templates_home_or_away_check check (home_or_away is null or home_or_away in ('home', 'away'))
);

alter table public.match_templates enable row level security;
create index match_templates_venue_id_idx on public.match_templates (venue_id);
