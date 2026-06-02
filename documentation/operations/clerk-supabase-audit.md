# Vérification Clerk + Supabase

Ce guide sert à vérifier où vivent les données importantes du projet :

- les comptes utilisateurs
- les rôles / admin
- les badges / progression

Quand il y a peu de comptes, le SQL manuel peut dépanner.
Quand il y a beaucoup de comptes, il faut utiliser l'audit automatisé.

## Ce qui est source de vérité

- Clerk stocke les métadonnées utilisateur :
  - `publicMetadata.role`
  - `publicMetadata.profile`
  - `privateMetadata.role`
  - `privateMetadata.profile`
  - `badges`
- Supabase stocke la copie métier :
  - `public.profiles`
  - `public.progression_profiles`
  - `public.progression_events`

## Mode recommandé pour beaucoup d'utilisateurs

Lance l'audit automatique depuis la racine du repo :

```bash
npm run data:audit:clerk-supabase
```

Le script lit automatiquement les variables d'environnement dans l'ordre suivant :

- `process.env`
- `apps/web/.env.local`
- `apps/web/.env.vercel.local`
- `apps/web/.env.production.local`
- `.env.local`

Il génère ensuite :

- `artifacts/clerk-supabase-audit.json`
- `artifacts/clerk-supabase-audit.csv`

Le rapport te montre :

- les comptes présents dans Clerk mais absents de Supabase
- les profils Supabase orphelins
- les écarts de rôles
- les données de progression et de badges liées à chaque utilisateur

## Étape Supabase

Le SQL manuel reste utile pour un contrôle ponctuel.

1. Ouvre le SQL Editor dans Supabase.
2. Copie-colle le contenu de [clerk-supabase-audit.sql](./clerk-supabase-audit.sql).
3. Exécute chaque requête séparément.
4. Exporte les résultats en CSV si tu veux me les renvoyer.

### Ce qu'il faut regarder

- `public.profiles`
  - présence des comptes
  - `role_label`
  - `handle`
  - `paris_arrondissement`
- `public.progression_profiles`
  - niveau actuel
  - niveau potentiel
  - XP total
- `public.progression_events`
  - événements validés / en attente
  - source des badges

## Étape Clerk

Si tu veux lancer l'audit automatique, le script peut déjà lire la clé depuis les fichiers `.env` locaux.

Si tu préfères l'imposer manuellement dans la session courante :

```powershell
$env:CLERK_SECRET_KEY="sk_live_xxx"
```

Puis lance l'audit :

```powershell
npm run data:audit:clerk-supabase
```

Si tu veux juste exporter les users Clerk sans comparer à Supabase :

```powershell
npm run data:export:clerk
```

Le script écrit alors :

- `artifacts/clerk-users.json`
- `artifacts/clerk-users.csv`

## Résultat attendu

Une fois l'audit prêt, on peut comparer :

- les comptes Clerk
- les rôles / admin
- les badges
- la progression

Le fichier SQL reste utile pour un diagnostic manuel ciblé.

Si tu veux, ensuite je peux te dire quoi migrer, quoi garder, et quoi recréer.
