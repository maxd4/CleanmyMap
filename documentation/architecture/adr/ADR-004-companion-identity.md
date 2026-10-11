# ADR-004 — Identité de l'application mobile (historique companion)

**Statut : contrats finalisés pour les LOTS 1, 2A et 2B — M0 rouvre le développement mobile**
**Date : 26 août 2026**

## Contexte

CleanMyMap est un seul produit et un seul monorepo avec deux applications
déployables : `apps/web` et `apps/mobile`. L'application mobile est issue de
l'ancien `companion-app`, nom conservé pour l'historique et les identifiants
techniques.

L'application web CleanMyMap utilise Clerk comme fournisseur d'identité principal.

Les profils sont représentés dans Supabase pour les jointures et règles métier.

Avant le LOT 1, l'application mobile utilisait le client Supabase Auth
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
comme dans l'application mobile.

L'application mobile utilise l'intégration native Clerk → Supabase Third-Party Auth.
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

Cette implémentation ne constitue pas une validation opérationnelle de
production. Le contrat Clerk, les RLS et la finalisation de distance sont
réalisés et restent invariants ; le comportement background headless et
l'usage opérationnel réel restent ouverts. `mission_actions` et la photo native
sont hors V1 et relèvent d'une évolution mobile future.

## Extension M-A — frontière native des actions

Le shell mobile M-A conserve Clerk comme identité commune et ajoute une
frontière HTTP bornée pour `Rejoindre une action`. Le mobile transmet le JWT de
session Clerk dans `Authorization: Bearer`; la route `/api/mobile/actions` le
vérifie explicitement avec `clerkClient().authenticateRequest` en acceptant le
token `session_token`, puis appelle les services métier existants. La présence
d'un Bearer n'est donc pas assimilée par hypothèse à la session résolue par
`auth()` des routes web : cette acceptation est couverte par une frontière et
des tests dédiés.

Les listes, demandes d'inscription, annulations, invitations, rattachements
post-action et reviews d'organisateurs réutilisent les contrats serveur. Une
inscription confirmée reste une ligne `action_registrations` et ne devient pas
une présence `action_participants`; un rattachement passé commence par un
claim `post_action_claim` `pending`, avec permissions, ownership et audit
évalués côté serveur. Le mobile ne reçoit jamais `service_role`.

## Extension M-B — création d'actions et signalements terrain

Le shell natif expose désormais les trois parcours Agir. La création reprend
les quatre sections du contrat web (`Essentiel`, `Terrain`, `Équipe et
logistique`, `Vérifier et publier`) et appelle les mêmes services de création,
mise à jour et publication. Le brouillon local n'est qu'une aide de reprise ;
les droits organisateur, les formalités, les invitations, les statuts et les
résultats restent décidés par le serveur.

Le signalement natif réutilise `trash_spotter_spots` pour `spot` et
`clean_place`, ainsi que le contrat média existant pour les preuves facultatives
et leurs quotas. La passerelle Bearer bornée couvre les routes complémentaires
Actions/Signalements ; elle tente la session web seulement pour les appels
cookie, puis vérifie explicitement le JWT Clerk natif avec
`authenticateRequest`. Une mission GPS reliée reste une mission à réconcilier
et ne crée jamais une participation finale.

## Extension M-C — espace Compte natif et cohérence UX

Le shell mobile conserve uniquement `Agir`, `Carte` et `Compte`. Compte
réutilise la frontière Bearer bornée `/api/mobile/account` pour projeter la
même identité Clerk, les préférences, l'onboarding, l'historique d'actions,
les inscriptions, les participations confirmées, les missions GPS, les actions
organisées, les invitations et les indicateurs calculés par le serveur.

Les écritures de profil synchronisent Clerk et le profil canonique Supabase ;
les préférences de nom, d'activité et de notifications appellent leurs routes
web existantes. `POST /api/account/active-profile` reste l'unique contrat de
changement de parcours actif : il vérifie les profils commutables et ne modifie
jamais `GRANTED_ROLE`. La confidentialité, les mentions légales, le contact et
la demande d'effacement restent les surfaces web canoniques ouvertes par des
ponts ciblés. Le mobile affiche une demande RGPD, pas une suppression immédiate.

## Extension M-D — navigation native et chrome mobile

La décision de chrome web reste inchangée : `RootLayoutChrome`, `HomeFooter` et
le contrat des rubans appartiennent au site. L'application mobile utilise son
propre registre borné et une barre inférieure permanente avec trois destinations
(`Agir`, `Carte`, `Compte`) et des icônes Lucide React Native. Les entrées
futures `Accueil`, `Réseau` et `Apprendre` restent dans le registre comme
planifiées mais ne sont pas exposées avant implémentation réelle ; la navigation
primaire ne dépasse pas cinq destinations.

Agir ouvre désormais les parcours `Rejoindre`, `Créer` et `Signaler` comme des
sous-vues navigables. Les composants restent montés pendant les changements
d'onglet afin de conserver les formulaires, appels en cours et brouillons.
Compte est le hub natif des utilitaires auparavant répartis dans le chrome web :
profil, activité/notifications, préférences, recherche, aide/feedback et
informations légales. Les surfaces web restantes sont ouvertes par des ponts
explicitement étiquetés, sans les présenter comme des réglages natifs.

## Contrat RLS Clerk — LOT 2A réalisé

La migration
`apps/web/supabase/migrations/20260826070000_clerk_missions_gps_rls.sql`
remplace les policies runtime historiques de `missions` et `gps_points` sans
modifier la migration historique `20260506000024_companion_gps_schema.sql`.

Le contrat effectif est le suivant :

- `missions` est lisible et modifiable par le client `authenticated` seulement
  lorsque `volunteer_id` correspond au claim Clerk `sub` non vide ;
- la création mobile est limitée par policy et grant à `(volunteer_id, label)`.
  `volunteer_id` doit correspondre au `sub` Clerk et le statut reste `pending`
  par défaut ;
- l'UPDATE mobile est limité par grant aux colonnes `status`, `started_at` et
  `ended_at` ; `created_by`, `distance_m` et `duration_s` ne sont pas
  modifiables par le client mobile ;
- `gps_points` est lisible et insérable seulement si la mission référencée
  appartient au même `sub` Clerk ; connaître un `mission_id` ne suffit pas ;
- l'absence de `sub` refuse l'accès et aucun grant client `anon` n'est conservé ;
- `service_role` reste réservé aux opérations serveur et conserve ses
  privilèges opérationnels ; il ne constitue pas l'identité de l'application
  mobile.

L'application mobile n'est toujours pas prête pour la production : la
synchronisation headless et l'usage opérationnel réel restent non validés.
`mission_actions` et la photo native sont hors V1 et ne bloquent pas ce
périmètre fonctionnel.

## Finalisation propriétaire — LOT 2B historique, corrigé par SEC-01

Le contrat RPC décrit ci-dessous est conservé comme historique du LOT 2B. Il a
été remplacé par SEC-01 : la finalisation est maintenant effectuée par un
trigger `BEFORE UPDATE` `SECURITY INVOKER` lors du passage à `completed`, et le
RPC `compute_mission_distance` est supprimé.

La migration additive
`apps/web/supabase/migrations/20260826080000_clerk_compute_mission_distance.sql`
avait rendu `compute_mission_distance(uuid)` exécutable par `authenticated` et
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

La fonction historique utilisait `SECURITY DEFINER` avec `search_path = pg_catalog` afin de
mettre à jour les colonnes dérivées sans réélargir les grants UPDATE mobiles.
Le chemin `service_role` reste technique et opérationnel. `stopTracking` vérifie
l'erreur RPC et ne déclare pas une finalisation complètement réussie lorsque
le calcul serveur échoue.

Le contrat courant est défini par
`apps/web/supabase/migrations/20260827100000_clerk_mission_completion_metrics_trigger.sql`.
Le mobile vide son buffer GPS avant l'UPDATE `completed`; le trigger invoker
calcule `distance_m` et `duration_s` dans `NEW`, et la ligne finalisée est
retournée par le même UPDATE. Les grants mobiles restent limités à
`status`, `started_at` et `ended_at`.

Le renouvellement fiable d'un token Clerk en réveil `TaskManager` headless n'est
pas résolu : sans token valide, le buffer local reste la seule issue et aucune
identité anonyme n'est utilisée.

## Reprise M0 de l'application mobile

Le lot M0 rouvre officiellement `apps/mobile` en `CURRENT / ACTIVE DEVELOPMENT`.
Cette reprise porte d'abord sur la baseline de tests et la cohérence de la
gouvernance ; elle n'ajoute aucune nouvelle fonctionnalité produit et ne refait
pas l'UI. L'application reste `NOT_PRODUCTION_READY` tant que le background
headless, l'usage opérationnel réel et la validation de production ne sont pas
établis. `mission_actions` et la photo native restent une évolution future hors
V1. Toute évolution ultérieure doit préserver les contrats Clerk, RLS et
métriques serveur ci-dessus.

Les identifiants `cleanmymap-companion` et `fr.cleanmymap.companion` sont les
identifiants historiques du prototype `companion` et ne sont plus l'identité
de publication de la V1. La configuration courante utilise le nom public
`CleanMyMap`, le slug Expo/EAS `clean-my-map`, le package Android et le Bundle
ID iOS `fr.cleanmymap.app`, ainsi que le projet EAS existant du propriétaire
`maxdie`. Le scheme `companion` est conservé car il reste nécessaire au retour
de l'authentification hébergée Clerk ; tout changement de scheme doit être
précédé d'une validation du callback Clerk.

## Options

### Option A — Clerk vers Supabase — retenue

L'application mobile obtient le token de session Clerk courant et le transmet à
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

## Clôture et suite hors application mobile

Le LOT 2B a traité l'appel client à `compute_mission_distance` et le gel
historique de l'application mobile ; ce passage a été corrigé par SEC-01 puis
remplacé par la décision de reprise M0. La validation opérationnelle réelle
reste à établir.

Le contrat ne doit pas supposer qu'un token Clerk peut toujours être renouvelé
hors d'un contexte Clerk entièrement initialisé : en son absence, le buffer
offline reste l'état attendu.

La roadmap mobile peut désormais reprendre par lots bornés, sans élargir les
contrats sécurisés ni qualifier l'application de prête pour la production.

## Migration et validation

Le LOT 2A a réalisé la bascule RLS additive :

1. conserver la migration historique inchangée ;
2. remplacer les policies runtime par le contrat fondé sur le `sub` Clerk ;
3. borner les grants UPDATE mobiles ;
4. vérifier propriétaire, tiers, `sub` absent et service role ;
5. conserver le buffer offline lorsque le token n'est pas disponible.

Le lot mobile de création de mission ajoute uniquement la policy et le grant
INSERT owner-scoped de
`20260928000003_mobile_mission_insert_owner_rls.sql`. Le mobile vérifie les
permissions GPS, crée cette mission propriétaire, puis réutilise le tracker
existant. Le moteur GPS live est désormais inclus dans la V1 ; aucun formulaire
`mission_actions` ni upload/photo natif n'est introduit.

Le LOT 2B a ajouté la migration additive de finalisation propriétaire et le
contrôle d'erreur RPC dans le tracking service. SEC-01 remplace ce chemin par
une finalisation déclenchée par l'UPDATE et supprime la surface RPC. La
validation de production reste exclue : aucune application distante de
migration ni usage opérationnel réel n'est déclaré ici.

## Tests requis

```txt
utilisateur A ne lit pas mission B
utilisateur A ne modifie pas mission B
app et web résolvent le même profil
sub Clerk absent refusé
champs sensibles mission non modifiables par authenticated
propriétaire seul peut finaliser une mission
tiers et sub absent refusés par les RLS
anon sans droit de mise à jour
écriture directe des colonnes dérivées refusée
la ligne finalisée est retournée par stopTracking
service_role absente du bundle
```

## Conséquences

La décision d'identité, de RLS et de finalisation est formalisée, mais
l'application mobile ne doit pas être qualifiée de prête pour la production.
Elle est `CURRENT / ACTIVE DEVELOPMENT` depuis M0 ; le background headless et
la validation opérationnelle restent ouverts. `mission_actions` et la photo
native sont une évolution future hors V1.
