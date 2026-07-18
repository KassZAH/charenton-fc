# Charenton FC

Application interne du club : convocations, feuilles de match, statistiques, votes de fin de match, blessures, covoiturage, cotisations, mémoire du club et administration. PWA installable sur iOS/Android, pensée pour être utilisée depuis un téléphone.

Stack : Next.js (App Router) · Supabase (Postgres + Row Level Security) · Tailwind CSS · authentification par PIN (bcrypt, sessions JWT).

## Installation

```bash
npm install
cp .env.example .env.local   # puis remplir les variables (voir ci-dessous)
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Voir `.env.example` pour le détail de chaque variable :

- `NEXT_PUBLIC_SUPABASE_URL` — URL du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé publique (protégée par RLS, aucune policy publique n'existe sur ce projet — tout l'accès passe par le service role côté serveur).
- `SUPABASE_SERVICE_ROLE_KEY` — clé complète, contourne RLS. Utilisée uniquement dans les Server Actions et Route Handlers, jamais exposée au navigateur.
- `SESSION_SECRET` — secret de signature des cookies de session. Générer avec :
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

`.env.local` est ignoré par git (`.gitignore`) — ne jamais committer de vraies clés.

## Migrations Supabase

Les migrations vivent dans `supabase/migrations/` et s'appliquent avec la [CLI Supabase](https://supabase.com/docs/guides/cli) :

```bash
npx supabase link --project-ref <ref-du-projet>
npx supabase db push --linked
```

Après toute migration qui ajoute/modifie une fonction ou une table, régénérer les types TypeScript :

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

## Créer le premier admin

Il n'y a pas d'inscription : les comptes sont créés par un admin depuis `/team` (ou directement en base pour le tout premier compte). Pour amorcer un nouveau projet, insérer directement une ligne dans `players` depuis l'éditeur SQL Supabase :

```bash
# 1. Générer le hash du PIN choisi (PIN admin recommandé : 6 chiffres)
node -e "console.log(require('bcryptjs').hashSync('123456', 10))"
```

```sql
insert into public.players (first_name, role, pin_hash, status)
values ('Prénom', 'admin', '<hash généré ci-dessus>', 'active');
```

Ce premier admin peut ensuite créer les autres comptes (joueurs, coachs, admins) depuis l'application.

## Tests, lint, build

```bash
npm test          # vitest — fonctions pures uniquement (pas de mock de base de données, voir plus bas)
npm run lint       # eslint
npx tsc --noEmit   # vérification des types
npm run build      # build de production
```

### Philosophie de test

Le socle de tests couvre volontairement les **fonctions pures à risque** (calculs de date, formatage, logique de score/CSC, visibilité des champs, génération ICS/WhatsApp/liens…), pas d'infrastructure de mock de base de données. La correction des Server Actions (permissions, verrouillage de saison, transactions) est vérifiée par des tests manuels ciblés contre une vraie base Supabase avant chaque déploiement, plutôt que par des tests d'intégration mockés.

## Déploiement (Vercel)

Le projet est déployé sur Vercel, branché sur `master`. Un `git push` déclenche un déploiement automatique. Pour vérifier qu'un déploiement a bien pris en compte le dernier commit :

```bash
vercel ls                                    # dernier déploiement, statut
vercel inspect <url> --logs | grep commit    # confirme le commit déployé
```

Variables d'environnement Supabase/`SESSION_SECRET` à configurer aussi côté Vercel (Project Settings > Environment Variables), en plus de `.env.local` en local.

## Sauvegardes

`/admin/sauvegardes` génère un export JSON complet et cohérent (toutes les tables, un seul appel transactionnel côté base). C'est un **téléchargement**, pas une sauvegarde automatique ni un point de restauration en un clic :

- il n'y a pas de bouton "restaurer" — une restauration se fait manuellement, table par table, depuis l'éditeur SQL Supabase ou l'interface Supabase ;
- les sauvegardes sont stockées dans la même base Supabase que les données elles-mêmes : si le projet Supabase est perdu ou corrompu, les sauvegardes qu'il contient le sont aussi. Télécharger régulièrement une copie du JSON en dehors de Supabase (ordinateur, stockage externe) ;
- une sauvegarde hebdomadaire automatique tourne via `/api/cron/weekly-backup` (cron Vercel), mais reste stockée dans Supabase — même limite que ci-dessus.

## Procédure d'urgence

**Une modification récente semble fausse (score, but, carton, joueur) :** `/history` liste les changements récents et permet de restaurer une entrée précise (annule l'action, pas besoin de tout reconstruire).

**Un match, but ou carton a été supprimé par erreur :** `/admin/corbeille` liste les éléments supprimés (soft-delete) et permet de les restaurer individuellement.

**Une session ou un PIN est compromis :** changer le PIN du joueur concerné depuis `/team/[id]` — ça régénère automatiquement `session_version`, ce qui invalide immédiatement toute session existante sur tous les appareils, sans attendre l'expiration du cookie (180 jours). Pour un lien calendrier ou profil public partagé par erreur, le joueur peut régénérer son lien lui-même depuis `/profile`.

**Trop de tentatives de PIN :** un compte se verrouille automatiquement 10 minutes après 5 échecs consécutifs — aucune action requise, ça se débloque seul.

**Perte ou corruption de données plus large :** restaurer depuis le dernier JSON téléchargé (voir "Sauvegardes" ci-dessus), table par table, via l'éditeur SQL Supabase. Il n'existe pas de restauration automatisée — prévoir que ça prend du temps et se fait à la main.

## Limites de la PWA

L'application est installable (icône sur l'écran d'accueil, écran de démarrage, mode plein écran), mais ne dispose pas de service worker personnalisé. Concrètement, ça veut dire :

- pas de mode hors-ligne — une connexion réseau est nécessaire ;
- pas de cache applicatif contrôlé — chaque page est rechargée depuis le serveur ;
- pas de notifications push ;
- pas de synchronisation en arrière-plan.

Ce n'est pas un bug, seulement une limite actuelle du projet (également documentée dans la page `/help` de l'application).
