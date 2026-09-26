# ADR-002 : Utilisation du Service Role Key Supabase côté serveur

*   **Statut** : Accepté, amendé le 26 septembre 2026 par `e7d90f6e`
*   **Date** : 20 avril 2026

## Contexte
CleanMyMap effectue des opérations administratives et des synchronisations
complexes (ex. Google Sheets vers Supabase, calculs d'impact agrégés) qui
peuvent nécessiter de manipuler plusieurs tables sans les restrictions
imposées par le Row Level Security (RLS) orienté utilisateur final.

Cette nécessité est ciblée : elle ne justifie pas que le client Supabase
serveur générique contourne implicitement le RLS. Le client anon utilisé seul
ne porte pas non plus le JWT Clerk ; il ne remplace donc pas le client RLS
Clerk lorsqu'une lecture authentifiée doit être évaluée par les policies.

## Décision
Utiliser la `SUPABASE_SERVICE_ROLE_KEY` exclusivement sur le serveur et
uniquement pour les chemins qui en ont réellement besoin.

Le contrat courant des helpers est le suivant :

- `getSupabaseServerClient()` utilise la clé anon par défaut ; le RLS reste
  donc la protection de données par défaut de cette primitive ;
- `getSupabaseServerClient(true)` demande explicitement le service-role et le
  bypass RLS ;
- `getSupabaseAdminClient()` est la façade explicite pour le même bypass
  administratif.

Tout bypass doit être volontaire, limité au chemin concerné et appelé après la
décision d'AuthN/AuthZ serveur adaptée à l'opération. L'anon key et le
service-role ne sont jamais exposés au navigateur.

**Raisonnement :**
1.  **Flexibilité ciblée** : Les opérations réellement administratives peuvent
    effectuer leurs jointures ou écritures complexes sans multiplier des
    policies RLS artificielles.
2.  **Défense en profondeur** : Le RLS et les policies restent actifs par
    défaut. La couche serveur ajoute l'AuthN/AuthZ requise avant tout chemin
    qui choisit explicitement le service-role ; elle ne remplace pas la
    nécessité de valider les entrées et de limiter les données retournées.
3.  **Isolation** : La clé de service n'est jamais exposée au navigateur
    (`NEXT_PUBLIC_`), et le choix de la clé privilégiée est visible dans le
    code appelant plutôt que caché dans le helper par défaut.

## Conséquences
- **Pas de bypass implicite** : Une route qui appelle
  `getSupabaseServerClient()` sans argument utilise l'anon key ; il est donc
  faux d'affirmer que les routes utilisent toutes un client contournant le
  RLS. Les chemins privilégiés sont identifiables par
  `getSupabaseServerClient(true)` ou `getSupabaseAdminClient()`.
- **Audit obligatoire** : Chaque chemin qui demande un bypass doit justifier
  cet accès et exécuter le guard serveur adapté (`requireAdminAccess`,
  `requireAuthenticatedAccess` ou équivalent) avant la création ou
  l'utilisation du client privilégié. Une session valide seule ne vaut pas
  autorisation.
- **RLS conservé** : Les policies restent nécessaires pour les accès anon ou
  RLS Clerk ; le service-role ne doit pas devenir un substitut de l'identité,
  de l'ownership ou de la décision AuthZ.
- **Vigilance** : Le bypass augmente le rayon d'impact d'une injection ou
  d'une faille de validation/autorisation. Le hardening repose notamment sur
  `isSupabaseConfigured`, les validations d'entrée et les bornes de données.

## Amendement 2026-09-26 — contrat courant

L'amendement introduit par `e7d90f6e` change le défaut de
`getSupabaseServerClient()` de service-role à clé anon. Les appels nécessitant
le bypass ont été rendus explicites dans le runtime ; ils doivent rester
revus au niveau de leur AuthN/AuthZ et de leur justification métier.

Cette formulation est cohérente avec :

- `apps/web/src/lib/supabase/server.ts` et son test de frontière de clés ;
- `documentation/security/supabase-review-checklist.md` ;
- `documentation/architecture/data-governance.md`.
