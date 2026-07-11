# ADR-004 — Identité de l'application compagnon

**Statut : proposé — à valider avant production mobile**  
**Date : 11 juillet 2026**

## Contexte

L'application web CleanMyMap utilise Clerk comme fournisseur d'identité principal.

Les profils sont représentés dans Supabase pour les jointures et règles métier.

L'application compagnon utilise actuellement le client Supabase Auth directement et peut appeler :

```ts
supabase.auth.signInAnonymously()
```

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

## Décision proposée

Clerk reste l'identité canonique de l'utilisateur CleanMyMap.

L'app compagnon doit utiliser une identité vérifiable qui permet à Supabase d'appliquer les règles attendues sans exposer `service_role`.

La solution finale peut utiliser un JWT Clerk compatible avec Supabase ou un autre mécanisme de liaison explicite, mais elle doit respecter les invariants suivants.

## Invariants

1. un utilisateur possède une identité canonique ;
2. aucune identité anonyme n'est assimilée implicitement à un profil Clerk ;
3. `service_role` n'est jamais embarquée dans l'app ;
4. la propriété d'une mission est vérifiable par RLS ou service serveur ;
5. le site et l'app attribuent la mission au même utilisateur ;
6. la suppression ou désactivation d'un compte reste traçable.

## Options

### Option A — Clerk vers Supabase

L'app obtient un token Clerk compatible avec Supabase.

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

### Option B — Table de liaison explicite

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

### Option C — Endpoint serveur

L'app appelle une API serveur qui vérifie l'identité et agit sur Supabase.

Avantages :

- logique centralisée.

Inconvénients :

- dépendance réseau accrue ;
- coût Vercel ;
- gestion des tokens.

## Recommandation

Évaluer d'abord l'option A, car elle conserve Clerk comme identité principale conformément à `ADR-001-clerk-auth.md`.

Ne pas utiliser l'option C par défaut pour chaque point GPS si cela augmente inutilement les coûts et la latence.

## Migration

Avant bascule :

1. inventorier les missions existantes ;
2. identifier les UIDs anonymes ;
3. définir le mapping ;
4. écrire la migration ;
5. tester propriétaire/non-propriétaire ;
6. tester expiration et refresh ;
7. tester offline ;
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
