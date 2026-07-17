-- Lot 10 — Administration et sécurité
--
-- Restauration volontairement limitée à sauvegarde + aperçu + téléchargement
-- (pas de réécriture automatique de ~25 tables liées en un clic — trop risqué
-- sans tests approfondis, voir ROADMAP_DEFERRED.md).

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  trigger_reason text not null,
  table_counts jsonb not null,
  snapshot jsonb not null,
  created_by_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint backups_trigger_reason_check check (
    trigger_reason in ('manual', 'before_reset', 'weekly', 'end_of_season')
  )
);

alter table public.backups enable row level security;

-- Verrouillage de saison : une saison clôturée passe en lecture seule.
-- Déverrouillage temporaire manuel pour une modification exceptionnelle.
alter table public.seasons
  add column is_locked boolean not null default false,
  add column locked_at timestamptz;
