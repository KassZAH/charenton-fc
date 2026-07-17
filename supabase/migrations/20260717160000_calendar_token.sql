-- Lot 5 — Calendrier et modèles
--
-- Abonnement calendrier permanent : un token stable par joueur pour authentifier
-- le flux .ics sans cookie de session (les applis calendrier récupèrent l'URL
-- elles-mêmes, périodiquement, jamais via le navigateur de l'utilisateur).

alter table public.players
  add column calendar_token uuid not null default gen_random_uuid() unique;
