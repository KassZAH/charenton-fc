-- Roadmap V3, Lot 5 — correctif de compatibilité de l'étape Expand.
--
-- players.pin_length a été posée avec DEFAULT 6 (migration 20260718060000).
-- Un DEFAULT unique ne peut pas refléter la vraie règle actuelle (4 pour
-- joueur, 6 pour admin/coach) : un nouveau joueur créé par l'ANCIEN code
-- encore en production (qui ignore pin_length et valide encore un PIN à 4
-- chiffres pour un joueur) recevrait pin_length = 6 par défaut — un
-- décalage silencieux qui bloquerait sa connexion dès que le nouveau code
-- (qui lit pin_length) serait déployé.
--
-- Un déclencheur BEFORE INSERT remplace le DEFAULT statique : il ne
-- s'applique que si pin_length est encore NULL au moment du déclencheur
-- (donc jamais pour le nouveau code, qui renseigne toujours pin_length
-- explicitement à l'insertion) et déduit alors la bonne valeur du rôle,
-- exactement comme le faisait l'ancien pinLengthForRole() côté application.
--
-- ⚠️ TEMPORAIRE — à retirer (DROP TRIGGER + DROP FUNCTION) une fois le
-- nouveau code confirmé déployé partout et qu'aucun ancien chemin de
-- création ne peut plus insérer sans pin_length. Suivi comme tâche de
-- l'étape "Contract" (D) du Lot 5, pas encore faite ici.

alter table public.players alter column pin_length drop default;

create or replace function public.fill_legacy_pin_length()
returns trigger
language plpgsql
as $$
begin
  if new.pin_length is null then
    new.pin_length := case when new.role = 'player' then 4 else 6 end;
  end if;
  return new;
end;
$$;

create trigger players_fill_legacy_pin_length
before insert on public.players
for each row
execute function public.fill_legacy_pin_length();
