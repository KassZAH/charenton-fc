-- Lot 6 — Partage et renforts
--
-- Appel à renfort : lien public temporaire (token, jamais de cookie de session)
-- pour chercher un joueur ponctuel sur un match précis. expires_at nul = permanent
-- (jusqu'à révocation manuelle) ; revoked_at marque une révocation manuelle.

create table public.reinforcement_calls (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  position_needed text not null,
  message text,
  created_by_player_id uuid references public.players(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reinforcement_calls_position_check check (position_needed in ('gardien', 'defenseur', 'joueur_de_champ'))
);

create index reinforcement_calls_match_id_idx on public.reinforcement_calls (match_id);

alter table public.reinforcement_calls enable row level security;
