-- Roadmap V3, Macro-release B (Lot 23) — Covoiturage avec affectations.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé (charenton-fc-lot7-test,
-- cimbymuifzooxrnenznd) tant que la macro-release n'est pas validée en
-- production.
--
-- Le covoiturage (qui conduit/cherche une place, availability.can_drive/needs_ride/
-- available_seats) existe depuis le Lot 7 — ce lot ajoute seulement QUI voyage avec QUI
-- (affectation passager→conducteur), le point/heure de départ du conducteur, et ne recopie
-- jamais automatiquement les réponses d'un match sur le suivant (chaque match reste indépendant,
-- aucune table de "préférence par défaut").

create table public.carpool_assignments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  driver_player_id uuid not null references public.players(id) on delete cascade,
  passenger_player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint carpool_assignments_no_self_drive check (driver_player_id <> passenger_player_id),
  -- Un passager n'a qu'un seul conducteur assigné par match (pas de double affectation ambiguë).
  constraint carpool_assignments_unique_passenger unique (match_id, passenger_player_id)
);

create index carpool_assignments_match_idx on public.carpool_assignments (match_id);
create index carpool_assignments_driver_idx on public.carpool_assignments (match_id, driver_player_id);

alter table public.carpool_assignments enable row level security;

alter table public.availability
  add column departure_point text,
  add column departure_time time;
