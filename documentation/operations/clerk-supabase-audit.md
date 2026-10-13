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
  - `publicMetadata.activeRole` pour le choix de capacité compatible
  - `publicMetadata.activeProfile` comme entrée UX legacy
  - `profile`, les métadonnées privées et `unsafeMetadata` uniquement pour
    inventorier une migration ; ils n'accordent aucun rôle privilégié
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

`role` est résolu exclusivement depuis `publicMetadata.role`. `admin` et `elu`
ne peuvent venir d'aucune autre métadonnée ; `max` exige en plus l'identifiant
exact `CLERK_IMU_OWNER_USER_ID`. Une valeur `activeRole` ou `activeProfile`
absente, invalide ou non commutable retombe sur un rôle compatible et ne peut
jamais augmenter `GRANTED_ROLE`.

## Routage des `bug_report`

Le routage des signalements suit une règle distincte de l'attribution des
rôles : lorsque `CLERK_IMU_OWNER_USER_ID` est configuré et non vide après
normalisation, le serveur adresse le message à cet identifiant exact et ne
consulte pas une allowlist ou un profil Supabase pour le remplacer. La variable
reste serveur uniquement ; elle ne confère aucun rôle à elle seule.

Si cette configuration est absente, le serveur utilise en secours le profil
Supabase `role_label=admin` le plus récemment mis à jour. Ce chemin est un
routage de continuité, pas une source d'attribution `admin` ou `max` ; il ne
doit jamais être utilisé pour décider d'une permission. Si aucun propriétaire
configuré ni administrateur projeté n'est disponible, le routage échoue fermé
plutôt que d'inventer un destinataire pour un expéditeur ordinaire. Les tests
doivent conserver la preuve de ces trois branches, y compris le traitement des
espaces et valeurs vides.

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
- `role=elu` ne peut pas choisir `activeProfile=admin` ;
- `role=admin` ne peut pas choisir `activeProfile=elu` ;
- `admin → activeProfile=max` est refusé ;
- `/api/account/profile-role` est une route retirée (`410`) et ne doit plus être
  utilisée par l'interface.

## Réparation contrôlée d'un compte

Cette procédure est réservée à l'IMU authentifié et configuré. Elle ne doit
jamais introduire d'adresse email, d'allowlist secondaire ou d'identifiant
Production dans le code, les tests ou la documentation. Les comptes
privilégiés existants doivent être inventoriés avant toute suppression des
compatibilités ; une entrée legacy est migrée explicitement ou signalée, jamais
rétrogradée silencieusement.

1. Vérifier l'accès Clerk avant toute écriture :

   ```powershell
   clerk doctor --json
   clerk whoami --json
   ```

   Le projet doit être lié à la bonne application Clerk et disposer des scopes
   BAPI requis. Ne jamais afficher `CLERK_SECRET_KEY` ni l'enregistrer dans un
   fichier du dépôt ; si elle est fournie dans la session, elle reste
   process-local.

2. Rechercher le compte avec l'outil Clerk autorisé et confirmer son identifiant
   Clerk exact. Un résultat ambigu impose un arrêt. Ne jamais sélectionner un
   compte par proximité, nom affiché, email codé en dur ou identifiant deviné.

3. Inventorier avant migration les anciennes sources, sans les consommer comme
   autorité :

   ```txt
   publicMetadata.profile
   privateMetadata.role / profile
   unsafeMetadata.role / profile
   anciennes variables d'allowlist si elles existent encore dans l'environnement
   ```

   Produire un inventaire borné des comptes concernés. Seul
   `publicMetadata.role` est ensuite retenu ; `max` est accepté uniquement si
   `user.id === CLERK_IMU_OWNER_USER_ID` et si cette variable est configurée.

4. Appliquer la réparation dans Clerk en préservant les autres métadonnées :

   ```txt
   compte admin : publicMetadata.role=admin
   compte max   : publicMetadata.role=max + id exact CLERK_IMU_OWNER_USER_ID
   ```

   L'écriture doit préserver toutes les métadonnées sans rapport avec
   l'autorisation. Le compte IMU owner est explicitement protégé contre les
   mutations ordinaires. Vérifier ensuite la réponse Clerk, sans copier de
   secret ni de données privées dans les logs.

5. Déclencher ou attendre la synchronisation canonique Clerk → Supabase, puis
   vérifier l'écart de rôle, le statut de convergence et la présence du compte :

   ```powershell
   npm run data:audit:clerk-supabase
   ```

   Conserver uniquement l'artefact d'audit prévu par le dépôt et vérifier que
   `public.profiles.role_label` correspond à `publicMetadata.role` après la
   contrainte owner, que `active_role_label` reste compatible, et que
   `role_projection_source` vaut `clerk_public_metadata_role` lorsqu'il est
   renseigné. Relever aussi `role_projection_synced_at` pour vérifier qu'une
   synchronisation postérieure à la mutation existe. Ces colonnes sont des
   projections serveur non modifiables par les clients. Une synchronisation
   échouée, notamment après révocation, est `BLOCKED`/divergente et doit être
   reprise idempotemment avant de déclarer la convergence.

## Révocation et divergence de projection

Après toute révocation `admin`, `elu` ou `max` :

1. conserver l'audit Clerk avec l'acteur, la cible, le motif, l'ancien rôle,
   le nouveau rôle et le résultat de synchronisation ;
2. vérifier que `role_label` et `active_role_label` ne conservent pas l'ancien
   privilège, que la source est canonique et que l'horodatage est postérieur à
   la mutation ;
3. reprendre la synchronisation avec la même opération idempotente si un champ
   diverge ;
4. ne déclarer `convergent` qu'après une nouvelle lecture des deux systèmes.

Une projection Supabase obsolète ne peut jamais réattribuer un rôle Clerk,
mais elle peut rester visible à une policy SQL historique. Les routes sensibles
doivent donc utiliser la décision Clerk côté serveur et l'incident reste
ouvert tant que la convergence n'est pas prouvée. Les policies, fonctions et
triggers PostgreSQL nécessitent une validation d'intégration réelle ; une
absence de Supabase CLI/Docker est `DB_SEMANTICS_NOT_EXECUTED`, pas un succès.

Si Clerk n'est pas lié, si les scopes manquent, si la clé serveur est absente,
si l'identité est ambiguë ou si la synchronisation ne peut pas être prouvée,
classer la réparation `BLOCKED`/`NOT_RUN` et ne pas simuler un état final.

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
  - `active_role_label`
  - `role_projection_source`
  - `role_projection_synced_at`
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
