-- Roadmap V3, Lot 5 — fonction transactionnelle pour le transfert de
-- propriété (même modèle que confirm_match_roster). N'est appelée par
-- aucune action déployée dans ce lot : la logique est posée et testable en
-- lecture de code, mais aucun transfert réel n'est déclenché tant qu'un
-- environnement isolé n'est pas disponible pour le tester en conditions
-- réelles (voir compte rendu du Lot 5).

create or replace function public.transfer_ownership(p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_owner_id uuid;
  v_new_owner_status text;
begin
  select status into v_new_owner_status from public.players where id = p_new_owner_id;
  if v_new_owner_status is distinct from 'active' then
    raise exception 'Le nouveau propriétaire doit être un joueur actif.';
  end if;

  select owner_player_id into v_old_owner_id from public.team_settings where id = 1;

  -- Le nouveau propriétaire devient coach s'il ne l'est pas déjà ; l'ancien
  -- propriétaire reste coach (on ne touche pas son role ici).
  update public.players
  set role = 'coach', session_version = session_version + 1
  where id = p_new_owner_id;

  if v_old_owner_id is not null and v_old_owner_id <> p_new_owner_id then
    update public.players set session_version = session_version + 1 where id = v_old_owner_id;
  end if;

  update public.team_settings set owner_player_id = p_new_owner_id where id = 1;
end;
$$;
