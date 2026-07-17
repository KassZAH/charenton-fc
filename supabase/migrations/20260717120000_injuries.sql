-- Lot 1 — Blessures et disponibilité
--
-- Une blessure est un épisode (pas juste un statut) : elle a un début, un
-- retour estimé, éventuellement un retour réel, et peut se refermer de
-- plusieurs façons (rétabli, annulée par erreur). Elle marque automatiquement
-- les convocations à venir comme "Blessé" tant qu'elle est active, via
-- availability.injury_id qui distingue ces lignes des statuts posés à la main.

create table public.injuries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'active',
  started_at date not null default current_date,
  estimated_return_date date,
  actual_return_date date,
  comment text,
  comment_visibility text not null default 'team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint injuries_status_check check (status in ('active', 'closed', 'cancelled')),
  constraint injuries_visibility_check check (comment_visibility in ('private', 'coach', 'team'))
);

create index injuries_player_id_idx on public.injuries (player_id);
create index injuries_active_player_idx on public.injuries (player_id) where status = 'active';

alter table public.injuries enable row level security;

alter table public.availability
  add column injury_id uuid references public.injuries(id) on delete set null;
