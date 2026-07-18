# Rollback — Lot 5, Étape C (initialisation du propriétaire et migration des rôles réels)

Document de traçabilité séparé de la migration `supabase/migrations/20260718090000_owner_and_coach_migration.sql`,
qui doit rester immuable (correspondance exacte avec le SQL réellement exécuté en production le 2026-07-18).

## Sauvegardes de référence

- **Backup principal** : `backups.id = 8c90c16d-663d-49a4-bfe7-0d3ad1438590`, label `before_owner_and_coach_migration`, créé via `export_backup_snapshot()` avant toute écriture. Couvre `players` (24 lignes) et `team_settings` (1 ligne), entre autres tables de `BACKUP_TABLES`.
- **Export complémentaire `audit_log`** (non couvert par `export_backup_snapshot()`, exclusion documentée) : fichier `audit_log_snapshot_before_owner_and_coach_migration.json` à la racine du dépôt, 15 lignes, ordonné par `created_at` croissant.
  - Checksum SHA-256 : `a23c067fb48d3c0a38f3df9b803ca25be25bca22665ef320b969a7952f60df8f`

## État exact immédiatement avant la migration

| Compte | id | role | session_version |
|---|---|---|---|
| Amine Zahid | `df419da0-1ed3-4ad5-af67-cf734e57a3fe` | `admin` | `1` |
| Ulysse Monneret | `c2602010-9367-4dab-82aa-c1397608b92d` | `admin` | `1` |
| Test Admin | `a146db21-386b-434f-930f-83e1f59a95e3` | `admin` | `1` |

`team_settings.owner_player_id` (id=1) : `null`

## Procédure de restauration

**Ne jamais utiliser `session_version = session_version - 1`** : un décrément arithmétique devient silencieusement faux si `session_version` a changé après cette migration (nouvelle connexion, changement de rôle ultérieur, etc.). Restaurer uniquement les valeurs exactes ci-dessus.

```sql
update public.players set role = 'admin', session_version = 1
where id = 'df419da0-1ed3-4ad5-af67-cf734e57a3fe'; -- Amine Zahid

update public.players set role = 'admin', session_version = 1
where id = 'c2602010-9367-4dab-82aa-c1397608b92d'; -- Ulysse Monneret

update public.players set role = 'admin', session_version = 1
where id = 'a146db21-386b-434f-930f-83e1f59a95e3'; -- Test Admin

update public.team_settings set owner_player_id = null where id = 1;
```

## Solution de secours principale

Restauration complète depuis `backups.id = 8c90c16d-663d-49a4-bfe7-0d3ad1438590` (`players` + `team_settings`), complétée par `audit_log_snapshot_before_owner_and_coach_migration.json` pour restaurer l'état exact de `audit_log` (non couvert par le mécanisme de sauvegarde standard). Vérifier le checksum SHA-256 ci-dessus avant de faire confiance au fichier.
