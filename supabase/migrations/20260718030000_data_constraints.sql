-- Audit du 2026-07-18, item #15 — l'application valide déjà une partie de ces
-- valeurs côté formulaire, mais la base doit rester la dernière ligne de
-- défense contre des valeurs absurdes (bug, appel direct à une Server Action,
-- accès direct à la base).

alter table public.matches
  add constraint matches_team_score_non_negative check (team_score is null or team_score >= 0),
  add constraint matches_opponent_score_non_negative check (opponent_score is null or opponent_score >= 0);

alter table public.goals
  add constraint goals_minute_range check (minute is null or (minute >= 0 and minute <= 130));

alter table public.cards
  add constraint cards_minute_range check (minute is null or (minute >= 0 and minute <= 130));

alter table public.availability
  add constraint availability_seats_non_negative check (available_seats is null or available_seats >= 0);

alter table public.player_measurements
  add constraint player_measurements_weight_plausible check (weight_kg is null or (weight_kg >= 30 and weight_kg <= 200)),
  add constraint player_measurements_height_plausible check (height_cm is null or (height_cm >= 100 and height_cm <= 230));

-- Empêche deux blessures actives simultanées pour le même joueur (déclarations concurrentes).
create unique index injuries_one_active_per_player
on public.injuries(player_id)
where status = 'active';
