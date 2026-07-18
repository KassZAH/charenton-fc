-- Roadmap V3, Lot 3 — V2 §3.1 demande une garantie base qu'une seule saison
-- soit active à la fois. seasons-actions.ts::startNewSeason désactive déjà
-- toujours l'ancienne saison avant d'insérer la nouvelle (jamais deux `true`
-- simultanés), donc cette contrainte ne fait que confirmer un invariant déjà
-- respecté par le seul code qui écrit cette colonne — même modèle que
-- injuries_one_active_per_player (20260718030000_data_constraints.sql).

create unique index seasons_one_active
on public.seasons(is_active)
where is_active = true;
