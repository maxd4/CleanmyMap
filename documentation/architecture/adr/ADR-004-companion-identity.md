# ADR-004 — Identité de l'application compagnon

**Statut : accepté pour le LOT 1 — LOT 2 requis avant production mobile**
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
RLS : les migrations `missions`/`gps_points` ne sont pas modifiées dans ce lot.

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

## Suite recommandée — LOT 2

Le LOT 2 doit définir et tester le contrat RLS Clerk des missions et
`gps_points`, notamment l'utilisation du `sub` Clerk pour l'ownership, puis le
comportement de synchronisation lorsque le TaskManager est réveillé headless.
Il doit aussi traiter la cohérence de finalisation et l'accès background sans
réintroduire d'identité Supabase Auth.

Le LOT 2 ne doit pas supposer qu'un token Clerk peut toujours être renouvelé
hors d'un contexte Clerk entièrement initialisé : en son absence, le buffer
offline reste l'état attendu.

## Migration

Avant bascule :

1. inventorier les missions existantes ;
2. identifier les UIDs anonymes ;
3. définir et tester le contrat RLS fondé sur le `sub` Clerk ;
4. écrire la migration ;
5. tester propriétaire/non-propriétaire avec tokens Clerk ;
6. tester expiration et refresh ;
7. tester offline et le réveil headless sans token ;
8. supprimer le chemin anonyme seulement après migration.

## Tests requis

```txt
utilisateur A ne lit pas mission B
utilisateur A ne modifie pas mission B
app et web résolvent le même profil
token expiré refusé
session restaurée correctement
service_role absente du bundle
```

## Conséquences

L'app compagnon ne doit pas être qualifiée de prête pour la production avant validation de cette décision.
