# Vérification Clerk + Supabase

Ce guide sert à vérifier où vivent les données importantes du projet :

- les comptes utilisateurs
- les rôles / admin
- les badges / progression
- la séparation entre rôle d'autorisation et profil UX actif

Quand il y a peu de comptes, le SQL manuel peut dépanner.
Quand il y a beaucoup de comptes, il faut utiliser l'audit automatisé.

## Ce qui est source de vérité

- Clerk stocke les métadonnées utilisateur :
  - `publicMetadata.role`
  - `publicMetadata.activeProfile`
  - `privateMetadata.role`
  - `privateMetadata.activeProfile` si présent pour compatibilité
  - `badges`
- Supabase stocke la copie métier :
  - `public.profiles`
  - `public.progression_profiles`
  - `public.progression_events`

Le contrat applicatif est :

```ts
role: Role                 // permissions réelles
activeProfile: AppProfile  // persona/navigation UX
```

`role` est résolu avant `activeProfile` et reste la seule source de décision
AuthZ. Une valeur `activeProfile` absente, invalide ou non commutable pour ce
`role` retombe sur `activeProfile = role`. Le champ historique `profile` ne doit
pas être utilisé comme sélecteur UX par un nouveau code.

## Mutation de profil actif

L'interface doit appeler exclusivement :

```txt
POST /api/account/active-profile
{ "activeProfile": "benevole|coordinateur|scientifique|entreprise|elu|admin|max" }
```

Le serveur résout le `role` courant, vérifie la cible avec
`getSwitchableProfiles(role)`, écrit uniquement `activeProfile` dans Clerk puis
appelle le mécanisme canonique Clerk → Supabase. Le payload ne peut pas
modifier `role`. En particulier :

- `role=max` reste `max` lorsqu'une persona `benevole` est choisie ;
- `role=admin` reste `admin` lorsqu'une persona `scientifique` est choisie ;
- `admin → activeProfile=max` est refusé ;
- `/api/account/profile-role` est une route retirée (`410`) et ne doit plus être
  utilisée par l'interface.

## Réparation contrôlée d'un compte

Cette procédure est réservée à un opérateur autorisé. Elle ne doit jamais
introduire d'adresse email privilégiée dans le code, les tests, les allowlists
versionnées ou la documentation. Les adresses sont fournies à l'exécution et
comparées exactement après normalisation minimale de casse et d'espaces.

1. Vérifier l'accès Clerk avant toute écriture :

   ```powershell
   clerk doctor --json
   clerk whoami --json
   ```

   Le projet doit être lié à la bonne application Clerk et disposer des scopes
   BAPI requis. Ne jamais afficher `CLERK_SECRET_KEY` ni l'enregistrer dans un
   fichier du dépôt ; si elle est fournie dans la session, elle reste
   process-local.

2. Rechercher l'utilisateur par email exact avec l'outil Clerk autorisé. Le
   résultat doit contenir exactement un utilisateur ; zéro résultat ou plusieurs
   résultats impose un arrêt. Ne jamais sélectionner un compte par proximité,
   nom affiché ou identifiant deviné.

3. Vérifier les allowlists sans publier leurs valeurs :

   ```txt
   CLERK_ADMIN_USER_IDS
   CLERK_MAX_USER_IDS
   ```

   Contrôler que l'identifiant Clerk retrouvé appartient à la liste attendue,
   selon le rôle à réparer. Une allowlist absente ne doit pas promouvoir un
   compte et une liste admin ne doit pas être réutilisée comme liste max.

4. Appliquer la réparation dans Clerk en préservant les autres métadonnées :

   ```txt
   compte admin : role=admin, activeProfile=admin
   compte max   : role=max,   activeProfile=max
   ```

   L'écriture doit être ciblée sur le compte résolu et ne doit pas accepter une
   adresse email codée en dur comme règle applicative. Vérifier ensuite la
   réponse Clerk, sans copier de secret ni de données privées dans les logs.

5. Déclencher ou attendre la synchronisation canonique Clerk → Supabase, puis
   vérifier l'écart de rôle et la présence du compte :

   ```powershell
   npm run data:audit:clerk-supabase
   ```

   Conserver uniquement l'artefact d'audit prévu par le dépôt et vérifier que
   `public.profiles.role_label` correspond au `role` Clerk. Le profil UX doit
   rester un choix d'interface ; il ne doit pas servir à conclure à une
   permission Supabase.

Si Clerk n'est pas lié, si les scopes manquent, si la clé serveur est absente,
si l'email ne produit pas exactement un résultat ou si la synchronisation ne
peut pas être prouvée, classer la réparation `BLOCKED`/`NOT_RUN` et ne pas
simuler un état final.

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

- `artifacts/audits/clerk-supabase-audit.json`
- `artifacts/audits/clerk-supabase-audit.csv`

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

- `artifacts/exports/clerk-users.json`
- `artifacts/exports/clerk-users.csv`

## Résultat attendu

Une fois l'audit prêt, on peut comparer :

- les comptes Clerk
- les rôles / admin
- les badges
- la progression

Le fichier SQL reste utile pour un diagnostic manuel ciblé.

Si tu veux, ensuite je peux te dire quoi migrer, quoi garder, et quoi recréer.
