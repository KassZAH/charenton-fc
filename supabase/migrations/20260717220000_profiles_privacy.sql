-- Lot 11 — Profils et confidentialité
--
-- Pas de "visibilité des statistiques" : les stats sont au coeur de l'appli et
-- partagées partout (classements, comparaisons...), les rendre privées irait
-- à l'encontre de toutes les fonctionnalités déjà construites autour.
-- Photo : toujours pas d'upload (aucune infra Supabase Storage, même choix
-- qu'aux Lots 8/9) — une URL externe optionnelle, comme pour les maillots.

alter table public.players
  add column birthday date,
  add column photo_url text,
  add column photo_visibility text not null default 'team',
  add column birthday_visibility text not null default 'team',
  add column measurements_visibility text not null default 'team',
  add column public_profile_enabled boolean not null default false,
  add column public_token uuid not null default gen_random_uuid() unique;

alter table public.players
  add constraint players_photo_visibility_check check (photo_visibility in ('private', 'coach', 'team', 'public')),
  add constraint players_birthday_visibility_check check (birthday_visibility in ('private', 'coach', 'team', 'public')),
  add constraint players_measurements_visibility_check check (measurements_visibility in ('private', 'coach', 'team', 'public'));

update public.players set measurements_visibility = case when share_measurements then 'team' else 'private' end;

alter table public.players drop column share_measurements;

-- Objectifs personnels : jamais publics, conformément à la roadmap (privé/coachs/équipe seulement).
create table public.player_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  achieved boolean not null default false,
  achieved_at timestamptz,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  constraint player_goals_visibility_check check (visibility in ('private', 'coach', 'team'))
);

alter table public.player_goals enable row level security;
