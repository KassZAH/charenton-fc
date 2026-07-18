-- Roadmap V3, Lot 5 — Étape A (expand) de la stratégie expand/migrate/contract.
-- Purement additif : aucune donnée de rôle n'est migrée ici, owner_player_id
-- reste NULL, la contrainte players_role_check n'est pas touchée (player,
-- admin, coach restent tous les trois acceptés). Le code de production
-- actuel (avant ce lot) ignore ces deux nouvelles colonnes et continue de
-- fonctionner sans aucun changement de comportement.

alter table public.team_settings
  add column owner_player_id uuid references public.players(id);

alter table public.players
  add column pin_length smallint;

-- Reflète la longueur réellement attendue aujourd'hui pour chaque compte
-- (4 pour joueur, 6 pour admin/coach) — jamais une valeur arbitraire.
update public.players
  set pin_length = case when role = 'player' then 4 else 6 end;

alter table public.players
  alter column pin_length set not null,
  alter column pin_length set default 6,
  add constraint players_pin_length_check check (pin_length in (4, 6));
