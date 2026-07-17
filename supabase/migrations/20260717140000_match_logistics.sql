-- Lot 2 — Logistique du match
--
-- Le RDV (meeting_time), l'adresse et le lien Maps existent déjà sur matches
-- (jamais branchés à l'UI), et le covoiturage existe déjà sur availability
-- (can_drive/needs_ride/available_seats, jamais branchés non plus — comment
-- réutilisé pour le point de départ). Il ne manque que le capitaine et le
-- matériel du match.

alter table public.matches
  add column captain_player_id uuid references public.players(id) on delete set null;

create table public.match_equipment_items (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  label text not null,
  assigned_player_id uuid references public.players(id) on delete set null,
  brought boolean not null default false,
  created_at timestamptz not null default now()
);

create index match_equipment_items_match_id_idx on public.match_equipment_items (match_id);

alter table public.match_equipment_items enable row level security;
