# Rollback — Lot 5, Étape D2 (retrait de `admin` de la contrainte SQL)

Document de traçabilité séparé de la migration `supabase/migrations/20260718100000_remove_legacy_admin_role_constraint.sql`,
qui doit rester immuable (correspondance exacte avec le SQL réellement exécuté en production le 2026-07-18).

## Sauvegarde de référence

- **Backup** : `backups.id = ac4f0e1b-6170-49c1-a057-8bfb6c751148`, label `before_remove_legacy_admin_role_constraint`, créé le `2026-07-18T14:38:05.039483+00:00` via `export_backup_snapshot()`. Couvre `players` (24 lignes) et `team_settings` (1 ligne), entre autres tables de `BACKUP_TABLES`.
- Checksum SHA-256 du snapshot complet : `a6b7bad04265be03b1c8ed7c730c63aa840fe96677f61de72f38548825f90381`

## État avant D2 (contrainte)

```sql
alter table public.players add constraint players_role_check
  CHECK ((role = ANY (ARRAY['player'::text, 'admin'::text, 'coach'::text])));
```

## État après D2 (contrainte finale)

```sql
CHECK ((role = ANY (ARRAY['player'::text, 'coach'::text])))
```

(vérifié par introspection `pg_get_constraintdef` après application — équivalent sémantique de `CHECK (role IN ('player', 'coach'))`, PostgreSQL normalise `IN` en `ANY(ARRAY[...])`.)

## Procédure de rollback

Le rollback réintroduit **uniquement** la contrainte temporaire acceptant à nouveau `admin` comme valeur possible — il ne doit :
- convertir aucun coach en admin ;
- modifier aucune ligne de `players` ;
- changer aucun `pin_hash` ni `pin_length` ;
- changer aucun `session_version` ;
- modifier `team_settings.owner_player_id`.

Nouvelle migration corrective (jamais une modification de `20260718100000_remove_legacy_admin_role_constraint.sql`) :

```sql
alter table public.players drop constraint players_role_check;

alter table public.players add constraint players_role_check
  CHECK (role IN ('player', 'coach', 'admin'));
```

Aucune ligne n'a besoin d'être réécrite : réintroduire `admin` dans la liste des valeurs acceptées ne fait qu'élargir de nouveau l'ensemble autorisé, sans toucher aux données existantes (toutes déjà `player` ou `coach`).

## Solution de secours principale

Restauration complète depuis `backups.id = ac4f0e1b-6170-49c1-a057-8bfb6c751148` (`players` + `team_settings`) si une anomalie plus large que la seule contrainte devait être corrigée. Vérifier le checksum SHA-256 ci-dessus avant de faire confiance au snapshot.
