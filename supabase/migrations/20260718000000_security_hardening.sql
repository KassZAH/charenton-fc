-- Sprint sécurité P0 (audit du 2026-07-18)
--
-- 1. session_version : incrémenté à chaque changement sensible (rôle, statut,
--    PIN) pour révoquer instantanément les sessions existantes, au lieu de
--    laisser un cookie de 180 jours faire foi sans jamais être revérifié.
-- 2. failed_pin_attempts / locked_until : verrouillage temporaire après trop
--    de tentatives de PIN incorrectes.

alter table public.players
  add column session_version integer not null default 1,
  add column failed_pin_attempts integer not null default 0,
  add column locked_until timestamptz;
