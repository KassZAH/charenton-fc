-- Roadmap V3, Lot 11.5 — correctif de sécurité découvert lors de la
-- vérification pré-déploiement production (§5 du cahier des charges).
--
-- Les trois tables créées par 20260721000000_external_standings_schema.sql
-- n'activaient pas Row Level Security, contrairement à absolument toutes les
-- autres tables du schéma (players, matches, etc.), qui l'activent avec
-- zéro policy définie (deny-by-default pour anon/authenticated — seul
-- service_role, utilisé exclusivement par supabaseAdmin côté serveur,
-- contourne RLS). Sans RLS, les GRANT par défaut du schéma public
-- (anon/authenticated ont SELECT/INSERT/UPDATE/DELETE sur toute nouvelle
-- table, comportement Supabase standard) s'appliquaient réellement :
-- confirmé en direct, la clé anon publique pouvait lire
-- external_competitions sans restriction. Aucune donnée sensible n'était
-- exposée au-delà de la ligne de configuration déjà publique par nature
-- (nom de compétition, URL source), mais l'écriture/suppression directe
-- était également possible — un écart réel par rapport au modèle de
-- sécurité du reste du projet, corrigé ici avant toute exposition
-- prolongée.

alter table public.external_competitions enable row level security;
alter table public.external_standings enable row level security;
alter table public.opponent_external_mappings enable row level security;
