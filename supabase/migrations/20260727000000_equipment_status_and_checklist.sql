-- Roadmap V3, Macro-release B (Lot 24) — Matériel enrichi, rotation capitaine et checklist.
--
-- ⚠️ Appliquée uniquement au projet Supabase isolé (charenton-fc-lot7-test,
-- cimbymuifzooxrnenznd) tant que la macro-release n'est pas validée en
-- production.
--
-- match_equipment_items.status remplace le simple booléen `brought` par 4 statuts (assigné,
-- confirmé, apporté, oublié) sans supprimer `brought` (transition, comme venue_id au Lot 22) —
-- aucun code applicatif ne lit plus `brought` après ce lot, mais la colonne reste pour ne rien
-- casser silencieusement si un export/rapport externe s'y appuyait déjà.
--
-- La checklist est strictement privée par joueur : aucune table ne mélange les items de deux
-- joueurs, aucune statistique publique n'en dépend. "Se réinitialise après le match" est un
-- effet de bord naturel : match_checklist_items est propre à un match donné, jamais reporté.

alter table public.match_equipment_items
  add column status text not null default 'unassigned',
  add constraint match_equipment_items_status_check
    check (status in ('unassigned', 'assigned', 'confirmed', 'brought', 'forgotten'));

update public.match_equipment_items
set status = case
  when brought then 'brought'
  when assigned_player_id is not null then 'assigned'
  else 'unassigned'
end;

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now()
);
alter table public.checklist_templates enable row level security;

create table public.player_checklist_preferences (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);
create index player_checklist_preferences_player_idx on public.player_checklist_preferences (player_id);
alter table public.player_checklist_preferences enable row level security;

create table public.match_checklist_items (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  label text not null,
  source text not null,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint match_checklist_items_source_check check (source in ('template', 'personal', 'contextual')),
  constraint match_checklist_items_unique unique (match_id, player_id, label)
);
create index match_checklist_items_player_match_idx on public.match_checklist_items (match_id, player_id);
alter table public.match_checklist_items enable row level security;
