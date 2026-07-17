-- Lot 4 — Résultat express et corrections
--
-- goals.goal_type accepte déjà 'csc' mais rien ne distingue à qui le but profite :
-- un CSC adverse (l'adversaire marque contre son camp) profite à Charenton, un CSC
-- Charenton (un joueur de Charenton marque contre son camp) profite à l'adversaire.
-- Sans cette colonne, impossible de contrôler que la somme des buts crédités à
-- Charenton correspond au score, ni d'éviter de créditer un but personnel pour un
-- csc_charenton.

alter table public.goals
  add column credited_to text not null default 'charenton',
  add constraint goals_credited_to_check check (credited_to in ('charenton', 'opponent'));
