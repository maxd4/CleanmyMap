# ADR-004 — Identité de l'application compagnon

**Statut : finalisé pour les LOTS 1, 2A et 2B — companion-app gelé**
**Date : 26 août 2026**

## Contexte

L'application web CleanMyMap utilise Clerk comme fournisseur d'identité principal.

Les profils sont représentés dans Supabase pour les jointures et règles métier.

Avant le LOT 1, l'application compagnon utilisait le client Supabase Auth
directement et proposait une identité anonyme.

Les migrations de missions utilisent cependant des relations vers `public.profiles(id)` et des policies fondées sur :

```sql
auth.uid()::text = volunteer_id
```

Un UID Supabase anonyme n'est pas automatiquement l'identifiant Clerk d'un profil existant.

## Problème

Sans contrat explicite, le système peut créer deux identités pour la même personne :

```txt
Clerk user id
Supabase Auth uid
```

Cela menace :

- ownership des missions ;
- RLS ;
- historique utilisateur ;
- attribution d'impact ;
- audit ;
- suppression de compte.

## Décision acceptée — LOT 1

Clerk est l'unique identité canonique de l'utilisateur CleanMyMap, sur le web
comme dans le companion-app.

Le companion utilise l'intégration native Clerk → Supabase Third-Party Auth.
Supabase est le data plane : le client mobile utilise la clé publique anon et
transmet le token de session Clerk courant via l'option `accessToken` de
`@supabase/supabase-js`.

L'authentification hébergée Clerk réutilise l'Account Portal et les méthodes
activées dans le compte Clerk. Le cache de token fourni par
`@clerk/expo/token-cache` est utilisé avec `ClerkProvider` et SecureStore.

Le LOT 1 ne copie pas de JWT template legacy, ne crée pas d'identité Supabase
Auth et n'embarque jamais `service_role`.

## Invariants

1. un utilisateur possède une identité canonique ;
2. aucune identité anonyme n'est créée ou assimilée à un profil Clerk ;
3. `service_role` n'est jamais embarquée dans l'app ;
4. le token Clerk est la seule identité transmise au data plane Supabase ;
5. le site et l'app attribuent la mission au même utilisateur ;
6. la suppression ou désactivation d'un compte reste traçable.

## Implémentation du LOT 1

Les invariants suivants sont désormais portés par le code :

- `ClerkProvider` enveloppe l'application avec un cache de token sécurisé Expo ;
- l'état d'accès est lu avec `useAuth`, et un utilisateur déconnecté ne peut
  pas ouvrir l'interface Mission ;
- l'authentification visible passe par `useHostedAuth` et l'Account Portal ;
- le client Supabase désactive sa persistance et son auto-refresh Auth et
  utilise le token Clerk courant via une abstraction unique ;
- l'absence de token ne déclenche aucun fallback d'authentification et laisse
  les points GPS dans le buffer offline.

Cette implémentation ne constitue pas encore une validation de production des
RLS : le contrat mobile Clerk est traité au LOT 2A, mais la finalisation et le
comportement background restent ouverts.

## Contrat RLS Clerk — LOT 2A réalisé

La migration
`apps/web/supabase/migrations/20260826070000_clerk_missions_gps_rls.sql`
remplace les policies runtime historiques de `missions` et `gps_points` sans
modifier la migration historique `20260506000024_companion_gps_schema.sql`.

Le contrat effectif est le suivant :

- `missions` est lisible et modifiable par le client `authenticated` seulement
  lorsque `volunteer_id` correspond au claim Clerk `sub` non vide ;
- l'UPDATE mobile est limité par grant aux colonnes `status`, `started_at` et
  `ended_at` ; `volunteer_id`, `created_by`, `distance_m` et `duration_s` ne
  sont pas modifiables par le client mobile ;
- `gps_points` est lisible et insérable seulement si la mission référencée
  appartient au même `sub` Clerk ; connaître un `mission_id` ne suffit pas ;
- l'absence de `sub` refuse l'accès et aucun grant client `anon` n'est conservé ;
- `service_role` reste réservé aux opérations serveur et conserve ses
  privilèges opérationnels ; il ne constitue pas l'identité du companion.

Le companion n'est toujours pas prêt pour la production : la synchronisation
headless, `mission_actions` et l'usage opérationnel réel restent non validés.

## Finalisation propriétaire — LOT 2B réalisé

La migration additive
`apps/web/supabase/migrations/20260826080000_clerk_compute_mission_distance.sql`
rend `compute_mission_distance(uuid)` exécutable par `authenticated` et
`service_role`, sans grant `anon` ou `public`.

Pour un utilisateur `authenticated`, la fonction :

- résout l'identité avec `coalesce((select auth.jwt()) ->> 'sub', '')` ;
- refuse un `sub` vide ;
- vérifie l'existence de la mission et `missions.volunteer_id = sub` avant de
  lire ses points ;
- calcule la distance uniquement depuis les `gps_points` de cette mission ;
- écrit `distance_m` et `duration_s` côté fonction serveur ;
- ne renseigne `duration_s` que lorsque `started_at` et `ended_at` sont
  exploitables et dans un ordre cohérent.

La fonction utilise `SECURITY DEFINER` avec `search_path = pg_catalog` afin de
mettre à jour les colonnes dérivées sans réélargir les grants UPDATE mobiles.
Le chemin `service_role` reste technique et opérationnel. `stopTracking` vérifie
l'erreur RPC et ne déclare pas une finalisation complètement réussie lorsque
le calcul serveur échoue.

Le renouvellement fiable d'un token Clerk en réveil `TaskManager` headless n'est
pas résolu : sans token valide, le buffer local reste la seule issue et aucune
identité anonyme n'est utilisée.

## Gel du companion-app

L'ADR-004 est fermée pour la roadmap mobile actuelle. Le companion-app est gelé
à long terme jusqu'à la finalisation et à l'utilisation réelle de l'application
web. Aucune nouvelle UI, capacité GPS, photo, action ou publication store ne
doit être engagée dans ce périmètre. `mission_actions` et les autres capacités
expérimentales restent hors production.

## Options

### Option A — Clerk vers Supabase — retenue

Le companion obtient le token de session Clerk courant et le transmet à
Supabase via Third-Party Auth.

Avantages :

- identité unique ;
- cohérence avec le web ;
- RLS réutilisable.

Points à vérifier :

- support React Native ;
- stockage du token ;
- refresh ;
- claims ;
- configuration tierce Supabase.

### Option B — Table de liaison explicite — rejetée pour ce contrat

Conserver deux identités techniques mais les relier explicitement.

Exemple conceptuel :

```txt
clerk_user_id
supabase_auth_uid
profile_id
```

Inconvénients :

- complexité ;
- synchronisation ;
- risques de dérive.

### Option C — Endpoint serveur — non retenue par défaut

L'app appelle une API serveur qui vérifie l'identité et agit sur Supabase.

Avantages :

- logique centralisée.

Inconvénients :

- dépendance réseau accrue ;
- coût Vercel ;
- gestion des tokens.

## Clôture et suite hors companion

Le LOT 2B a traité l'appel client à `compute_mission_distance` et a gelé le
companion-app jusqu'à la finalisation et à l'utilisation réelle de l'application
web.

Le contrat ne doit pas supposer qu'un token Clerk peut toujours être renouvelé
hors d'un contexte Clerk entièrement initialisé : en son absence, le buffer
offline reste l'état attendu.

La roadmap revient désormais aux fonctionnalités web. Aucun nouveau lot
companion n'est recommandé avant une décision explicite de dégel.

## Migration et validation

Le LOT 2A a réalisé la bascule RLS additive :

1. conserver la migration historique inchangée ;
2. remplacer les policies runtime par le contrat fondé sur le `sub` Clerk ;
3. borner les grants UPDATE mobiles ;
4. vérifier propriétaire, tiers, `sub` absent et service role ;
5. conserver le buffer offline lorsque le token n'est pas disponible.

Le LOT 2B a ajouté la migration additive de finalisation propriétaire et le
contrôle d'erreur RPC dans le tracking service. La validation de production
reste exclue : aucune application distante de migration ni usage opérationnel
réel n'est déclaré ici.

## Tests requis

```txt
utilisateur A ne lit pas mission B
utilisateur A ne modifie pas mission B
app et web résolvent le même profil
sub Clerk absent refusé
champs sensibles mission non modifiables par authenticated
propriétaire seul peut exécuter compute_mission_distance
tiers et sub absent refusés par la fonction
anon sans EXECUTE
erreur RPC propagée par stopTracking
service_role absente du bundle
```

## Conséquences

La décision d'identité, de RLS et de finalisation est formalisée, mais l'app
compagnon ne doit pas être qualifiée de prête pour la production. Elle est
gelée à long terme jusqu'à la finalisation et à l'utilisation réelle de
l'application web.
