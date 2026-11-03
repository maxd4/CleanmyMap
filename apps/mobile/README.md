# Application mobile — CleanMyMap

Application mobile Expo/React Native dédiée au suivi GPS des missions terrain.

Elle est issue de l'ancien `companion-app`, terme conservé uniquement pour
l'historique. L'identité de publication V1 est `CleanMyMap`, avec le projet
Expo/EAS `clean-my-map` et les identifiants natifs `fr.cleanmymap.app`. Elle
appartient au même produit et au même
monorepo que `apps/web` ; elle n'est ni une copie ni un projet indépendant.

## Statut

**CURRENT / ACTIVE DEVELOPMENT — NOT_PRODUCTION_READY.**

Les lots 1, 2A et 2B de l'ADR-004 ont raccordé l'identité Clerk, les RLS
`missions`/`gps_points` et la finalisation propriétaire de distance. L'application
mobile est officiellement rouverte par le lot M0 pour reprendre son
développement. La baseline conserve un frontend volontairement réduit et
réutilise les surfaces web existantes lorsque cela suffit. La V1 fonctionnelle
couvre le GPS avec carte et tracé, la reprise/offline, la finalisation serveur,
le contact d'urgence et les trois parcours Agir natifs : participation,
création/publication d'une action et signalement terrain.
L'application reste non prête pour la production tant
que le background headless, les appareils réels et les services de distribution
ne sont pas validés.

Références :

- [Architecture GPS companion](./architecture_gps_companion.md)

```txt
documentation/architecture/adr/ADR-004-companion-identity.md
documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md
```

Cette section et les suivantes décrivent l'architecture et les contrats
actuels du checkout. La section [preuve historique de release mobile](#history--état-de-release-mobile--preuves-au-11-octobre-2026)
est une preuve datée d'un artefact passé : elle ne constitue pas une preuve de
release actuelle, de disponibilité store, de rotation des credentials ou de
fonctionnement des parcours non exécutés.

## Cartographie rapide vérifiée

Cette section sert de point d'entrée. Elle résume les owners du checkout ; les
contrats détaillés d'identité, de RLS, de stockage owner-scoped et de GPS restent
dans [architecture_gps_companion.md](./architecture_gps_companion.md) et la
décision d'identité dans
[ADR-004](../../documentation/architecture/adr/ADR-004-companion-identity.md).

| Surface | Owner actuel | Rôle vérifié |
|---|---|---|
| Entrée Expo | [`index.ts`](./index.ts), [`App.tsx`](./App.tsx), [`app.json`](./app.json) | Enregistre la tâche GPS avant `registerRootComponent`, initialise les polyfills, Clerk, le cache sécurisé et le shell. |
| Navigation | [`screens/mobile-shell.tsx`](./screens/mobile-shell.tsx), [`mobile-shell-contract.ts`](./screens/mobile-shell-contract.ts) | Barre native persistante `Agir` / `Carte` / `Compte`; sous-vues `Rejoindre`, `Créer`, `Signaler`; `Accueil`, `Réseau`, `Apprendre` restent planifiées. |
| Écrans | [`screens/mobile-shell.tsx`](./screens/mobile-shell.tsx) | Compte, création et participation d'action, signalement, mission active/carte, finalisation, contact et appel d'urgence. |
| Hooks/controllers | [`hooks/use-companion-mission-controller.ts`](./hooks/use-companion-mission-controller.ts) | `useCompanionMissionController`, `useAccountController`, `useActionCreateController` portent respectivement mission/GPS, projection Compte et brouillon/création d'action. |
| Services | [`lib/mobile-api-client.ts`](./lib/mobile-api-client.ts) | Client HTTP mobile, Actions, Compte, média de signalement, mission liée, tracking GPS, géométrie, permissions, environnement et contact d'urgence. |
| Stockage | [`lib/storage.ts`](./lib/storage.ts), cache Clerk | `AsyncStorage` conserve surface, brouillons, mission, buffer, tracé, réconciliations et la clé de reprise de création de mission namespacés par owner; `SecureStore` porte le cache de token Clerk et le contact d'urgence natif. |
| GPS | [`lib/tracking-service.ts`](./lib/tracking-service.ts), [`tasks/gps-task.ts`](./tasks/gps-task.ts), [`screens/mission-active-map.tsx`](./screens/mission-active-map.tsx) | `expo-location`, `expo-task-manager` et `react-native-maps` couvrent permissions, suivi foreground, tâche background câblée, restauration/replay et affichage du tracé; les métriques finales restent serveur. |
| Authentification | [`App.tsx`](./App.tsx), [`lib/supabase.ts`](./lib/supabase.ts) | Clerk est l'identité canonique; `ClerkProvider` + `tokenCache` et Bearer `session_token` alimentent Supabase Third-Party Auth et les frontières HTTP mobiles. |
| API et données consommées | [`lib/mobile-actions-service.ts`](./lib/mobile-actions-service.ts), [`mobile-account-service.ts`](./lib/mobile-account-service.ts), [`tracking-service.ts`](./lib/tracking-service.ts) | Routes `/api/mobile/actions`, `/api/mobile/account`, `/api/mobile/account/deletion-request`, `/api/actions`, `/api/spots`, `/api/signalements`, `/api/account`, `/api/users/profile`, `/api/notifications`, `/api/missions` et `/api/missions/:id/reconcile`; les routes mission acceptent le Bearer Clerk mobile via la frontière canonique et la création liée porte une `Idempotency-Key` owner-scoped. Tables Supabase `missions` et `gps_points`. |
| Tests et contrôles | [`tests/mobile-shell-contract.test.ts`](./tests/mobile-shell-contract.test.ts), [`security/braces-security.test.mjs`](./security/braces-security.test.mjs) | Vitest couvre runtime, contrats, reprise, identité, stockage, GPS et écrans; les tests Node dédiés couvrent les dépendances vendorisées. Commandes: `mobile:typecheck`, `mobile:test`, `mobile:security`, `mobile:lint`, `quality:mobile-coverage`. |

### Dépendances directes du workspace

Les chemins HTTP effectivement appelés sont : `/api/mobile/actions` et ses
sous-routes ; `/api/mobile/account` et `/api/mobile/account/deletion-request` ;
`/api/actions` et ses sous-routes de création, publication, jour et rôles ;
`/api/spots` ; `/api/signalements/me`,
`/api/signalements/:id/media`, `/api/signalements/:id/media/intents` et
`/api/signalements/:id/media/:mediaId/finalize` ;
`/api/account/active-profile`, `/api/account/activity-status`,
`/api/users/profile/display-name-mode` et `/api/notifications/preferences` ;
`/api/missions` et `/api/missions/:id/reconcile`. Le code et les tests de chaque famille
restent les owners de leur contrat ; cette liste n'en crée pas un second.

Le manifeste [`package.json`](./package.json) est la liste exhaustive et
versionnée. Les dépendances runtime structurantes sont `expo`, `react`,
`react-native`, `@clerk/expo`, `@supabase/supabase-js`,
`@react-native-async-storage/async-storage`, `expo-secure-store`,
`expo-location`, `expo-task-manager`, `react-native-maps`,
`react-native-safe-area-context`, `react-native-svg`, `lucide-react-native`,
`@expo/vector-icons`, `expo-image-picker`, `expo-linking`, `expo-web-browser`,
`expo-auth-session`, `expo-dev-client`, `expo-build-properties`, `expo-crypto`,
`expo-constants`, `expo-splash-screen`, `expo-status-bar` et
`react-native-url-polyfill`. Les dépendances de validation directes sont
`@types/react`, `eslint`, `eslint-plugin-react`, `globals`, `typescript`,
`typescript-eslint`, `vitest`, `@vitest/coverage-v8` et le correctif local
`braces` déclarés dans `devDependencies`.

### Statut des capacités

| État | Capacités et limites |
|---|---|
| `CURRENT` | Shell et UI mobiles autonomes, authentification Clerk, missions GPS owner-scoped, carte/tracé, buffer et reprise locale, finalisation serveur, contact d'urgence, participation/création/signalement terrain et ponts web explicitement étiquetés. |
| `LIMITED / NOT_PRODUCTION_READY` | Les tests locaux et la configuration Expo ne prouvent ni l'acceptation d'un JWT Clerk réel, ni le suivi background sur appareil, ni la reprise après kill/verrouillage/perte réseau en conditions opérationnelles, ni iOS, signature, stores ou conformité de distribution. |
| `FUTURE` | Validation opérationnelle Android/iOS par plateforme, background headless réellement éprouvé, destinations planifiées et éventuelles évolutions `mission_actions`/photo de mission après décision dédiée. macOS reste hors engagement. |

Ne pas lire `CURRENT` comme une preuve de production : les preuves historiques
de build sont isolées dans la section `HISTORY` plus bas. Aucun package partagé
mobile/web n'est requis tant qu'un consommateur réel et un owner commun ne sont
pas démontrés.

## PLAN — Évolutions mobiles différées

Les capacités ci-dessous sont des orientations produit, pas des fonctionnalités
livrées. Elles disposent actuellement d'une page native statique marquée
`En préparation` afin de rendre la roadmap visible sans inventer de parcours,
données ou contrat. Toute implémentation future devra d'abord identifier le
contrat web stabilisé, l'owner serveur, les droits, les états d'erreur et les
preuves propres à la capacité. Les contrats d'identité, de GPS et de
finalisation restent ceux de
[architecture_gps_companion.md](./architecture_gps_companion.md) et
[ADR-004](../../documentation/architecture/adr/ADR-004-companion-identity.md) ;
cette liste ne les recopie pas.

| Statut | Capacité différée | Point d'accès mobile préparé | Limite actuelle |
|---|---|---|---|
| `PLAN` | Carte native | Onglet `Carte` → `Carte native` | Le parcours opérationnel reste le pont web `/actions/map`. |
| `PLAN` | Bilan après action | Onglet `Agir` → `Bilan après action` | Aucun bilan ni indicateur n'est calculé localement. |
| `PLAN` | Gestion avancée des actions | Onglet `Agir` → `Gestion avancée des actions` | Les parcours actuels de participation/création restent inchangés. |
| `PLAN` | Notifications | `Compte` → `Activité et notifications` → `Notifications` | Les préférences actuellement synchronisées restent `CURRENT`; aucune notification native n'est ajoutée ici. |
| `PLAN` | Discussions | `Compte` → `À propos` → `Discussions` | Le lien web `/sections/messagerie` reste la surface actuelle. |
| `PLAN` | Préparation d'itinéraires | Onglet `Carte` → `Préparation d'itinéraires` | Aucun itinéraire, calcul ou stockage de route n'est implémenté. |
| `PLAN` | Historique détaillé | `Compte` → `Activité et notifications` → `Historique détaillé` | L'historique résumé actuel reste `CURRENT`. |
| `PLAN` | Impacts et rapports | `Compte` → `Activité et notifications` → `Impacts et rapports` | Les indicateurs actuels restent ceux fournis par le serveur et ne sont pas recalculés. |

**Horizon indicatif : septembre 2027.** Cette date désigne un horizon de
stabilisation attendu du Web susceptible de conditionner la reprise de ces
plans ; elle ne constitue ni une date de livraison mobile, ni un engagement de
roadmap. Android et iOS resteront à adapter et à valider séparément ; macOS
reste une cible distincte non engagée.

Les pages d'attente utilisent une présentation commune et des définitions
simples dans [`screens/planned-capabilities.tsx`](./screens/planned-capabilities.tsx).
Elles ne créent ni appel API, ni service, ni modèle, ni stockage, ni calcul,
ni dépendance nouvelle. Aucun package partagé ne doit être créé avant
l'existence d'un consommateur réel et d'un owner établi.

## Périmètre V1

La V1 mobile s'adresse aux bénévoles terrain et reste volontairement réduite
pour être stabilisée et publiée rapidement. Le site web reste la surface
complète du produit et continue d'évoluer indépendamment ; l'application mobile
ne cherche pas à reproduire toutes ses pages ou capacités.

La V1 fonctionnelle inclut :

- le mode activité GPS live avec carte, restauration du tracé et suivi temps réel ;
- les contacts d'urgence ;
- `Rejoindre une action` avec recherche, détail, inscription future, annulation,
  invitations, suivi et rattachement post-action soumis à validation.
- `Créer une action` avec reprise locale et serveur, les quatre sections
  `Essentiel`, `Terrain`, `Équipe et logistique`, `Vérifier et publier`, puis
  les espaces opérationnels `Préparer` / `Jour J` exposés par l'API canonique.
- `Signaler un déchet` avec `spot` / `clean_place`, position actuelle ou
  manuelle, catégories, observations, photos facultatives, reprise média et
  `Mes observations` (`new`, `validated`, `cleaned`).

Les autres capacités réutilisent au maximum les contrats, données et services
existants du backend commun. La V1 ne crée ni package `shared` générique, ni
second modèle métier, ni gamification parallèle côté mobile.

## Shell mobile V1

Le shell expose une seule barre de navigation permanente en bas de l'écran avec
trois destinations persistantes : `Agir`, `Carte` et `Compte`. Les icônes sont
Lucide React Native, l'état sélectionné est exposé aux technologies
d'assistance et la `SafeAreaView` conserve l'accessibilité de la barre sur les
appareils à encoche ou à barre système. Le registre
`MOBILE_DESTINATION_REGISTRY` contient également `Accueil`, `Réseau` et
`Apprendre` comme destinations planifiées, sans les afficher tant que leurs
parcours natifs ne sont pas réellement implémentés. Il n'y a jamais plus de
cinq destinations primaires sans accès secondaire explicite.

Les huit entrées `PLAN` de la roadmap sont accessibles comme sous-pages
discrètes depuis les surfaces concernées ; elles ne deviennent pas des onglets
primaires et ne masquent aucun parcours `CURRENT`. Leur retour revient à la
surface précédente et le retour système conserve le même comportement que les
sous-vues existantes.

`Agir` présente quatre choix dans des sous-vues navigables :

- `Démarrer une action` vérifie une seule fois les permissions GPS avant de créer
  une mission `pending` owner-scoped avec le `sub` Clerk, puis réutilise
  `startTracking` pour afficher la mission active. Depuis une action sélectionnée
  et confirmée, le même contrôleur transmet son `actionId` : la création passe
  par `POST /api/missions` avec le Bearer Clerk, puis le GPS et la finalisation
  conservent ce même identifiant jusqu'à `/api/missions/:id/reconcile`. La clé
  `Idempotency-Key` est conservée localement par owner pendant une reprise réseau
  ambiguë, puis supprimée lorsque le suivi démarre ou que l'annulation serveur
  aboutit. Si le démarrage GPS échoue, la mission créée est annulée et l'écran actif n'est pas affiché. La mission
  active restaure les `gps_points` owner-scoped, fusionne son tracé UX local et
  reprend le suivi foreground au retour au premier plan et relance le replay du
  buffer local dès que la session Clerk est disponible. Ce suivi ne réécrit pas
  les points ni les métriques dans Supabase. Si la session ou le réseau manque
  pendant une finalisation, la mission reste active, le suivi est repris et
  l'interface distingue l'indisponibilité de la synchronisation d'un état à
  jour ; aucune mission terminée n'est annoncée avant l'accusé serveur.
  `mission_actions` reste hors runtime ; une activité GPS peut seulement être
  reliée à une action éligible via `createLinkedMission` et sa réconciliation
  serveur. Le mobile ne calcule ni la distance ni la durée ;
- `Rejoindre une action` est natif et passe par la frontière HTTP mobile
  `/api/mobile/actions` ;
- `Organiser une action` réutilise les validations Actions côté serveur. Le
  brouillon local est une aide de reprise ; une lecture AsyncStorage échouée
  bloque toute écriture locale jusqu'à une récupération explicite, et la
  publication n'est confirmée qu'après réponse serveur. Chaque brouillon
  conserve une clé de création stable, envoyée dans `Idempotency-Key` lors du
  POST `/api/actions` ; le serveur la rattache au créateur et à l'action via
  une unicité PostgreSQL et une RPC transactionnelle qui persiste aussi les
  organisateurs et inscriptions initiales. Une réponse perdue est donc
  rejouable sans succès prématuré ni doublon ; une migration absente bloque la
  création au lieu de réactiver un chemin non idempotent. Le brouillon et cet
  identifiant sont persistés dans AsyncStorage sous la clé
  `cleanmymap.mobile.action-create.v1:<userId-Clerk>` ; la lecture, la reprise
  et l'écriture sont donc limitées à l'identité courante. Une déconnexion ou un
  changement de compte vide immédiatement l'état exposé et bloque les
  mutations jusqu'à la nouvelle hydratation. Une lecture différée de l'ancien
  compte est ignorée, et une ancienne clé globale n'est migrée que si elle
  contient un `ownerId` Clerk exact ; un brouillon global sans propriétaire
  vérifiable reste ignoré.
- `Signaler un déchet` écrit uniquement dans `trash_spotter_spots`, transmet les
  photos via les intents média canoniques et n'affiche jamais un statut avant
  confirmation serveur.

Les sous-vues Agir restent montées pendant les changements d'onglet afin de
préserver les saisies, les chargements et les brouillons. Le bouton de retour
revient à l'accueil Agir, puis le retour système revient à l'onglet Agir avant
de quitter le shell. Une mission active quitte ce shell pour conserver la carte
GPS plein écran et ses interfaces de finalisation.

La destination `Carte` ouvre `/actions/map` pour la consultation existante. Le
mobile n'implémente pas de deuxième messagerie. `Compte` est un hub à sections
(`Mon profil`, `Activité et notifications`, `Préférences`, `Rechercher`, `Aide
et feedback`, `À propos et informations légales`) et charge une projection
privée bornée depuis `/api/mobile/account` : identité Clerk, onboarding,
localisations préférées, rôle attribué/parcours actif, préférences, indicateurs
serveur, historique, invitations, missions GPS et actions organisées. Les
mutations de profil, parcours actif, nom affiché, activité et notifications
réutilisent les contrats web canoniques avec le Bearer Clerk. Les pages web
`/politique-confidentialite`, `/mentions-legales` et `/contact` restent les
surfaces canoniques pour les droits, le contact et la demande d'effacement.
Les raccourcis web du compte pointent vers les surfaces canoniques : `Réseau
CleanMyMap` ouvre `/sections/annuaire` et `Groupes de discussion` ouvre
`/sections/messagerie`. Le pont ouvre une URL web externe et ne transfère pas
automatiquement la session Clerk native vers une session de navigateur ; une
connexion web distincte peut donc être requise par la surface cible.
Le compte permet aussi d'enregistrer un unique contact d'urgence dans le
SecureStore local.
Avant toute boîte de permission système, le mobile affiche une explication
native de la collecte des points, du suivi écran éteint, de leur transmission
avec la session Clerk et de la reprise locale hors ligne. Un refus interrompt
le démarrage et permet une nouvelle tentative ultérieure.
Les identifiants de mission active, index de buffer, points GPS en attente,
tracés foreground, réconciliations liées et brouillons de création d'action
sont namespacés par identifiant Clerk. Une session expirée ou un changement de
compte ne peut donc pas lire, réutiliser, rejouer ni muter les données d'un
autre compte ; les données du propriétaire restent récupérables à sa
reconnexion. Les anciennes clés locales sans owner connu sont ignorées par
conception. Chaque point reçoit aussi un `client_point_id` avant
l'envoi direct ; le même identifiant est conservé dans le buffer et lors du
rejeu, avec une unicité par mission côté PostgreSQL pour absorber une perte
d'acquittement sans doublon.
Dans `Compte > À propos et informations légales`, un utilisateur connecté peut
confirmer une demande de suppression. La route mobile authentifie le Bearer
Clerk, limite les abus et enregistre la demande dans `contact_requests` avec un
identifiant. `notificationStatus=failed` signifie que la demande existe mais
que la notification doit être reprise ; `deletionProcessed=false` reste affiché
tant qu'aucun traitement RGPD effectif n'est confirmé. Après désinstallation,
la même demande reste accessible depuis `/contact` sur le web.
Pendant une mission active, le bénévole peut confirmer l'ouverture d'un appel
vers ce contact ou vers le 112 via `tel:` ; aucune position n'est envoyée
automatiquement.

## Stack

```txt
Expo 57
React Native 0.86.3
TypeScript 6.0.3
expo-dev-client (development build)
expo-splash-screen
Clerk Expo SDK
Supabase client (data plane)
SecureStore
AsyncStorage
expo-location
expo-task-manager
```

Les mises à jour OTA via EAS Update sont explicitement désactivées pour cette
phase (`updates.enabled = false`). Leur activation devra faire l'objet d'une
décision de déploiement dédiée, avec validation de la stratégie de version et
de signature.

Le SDK Expo 57 est aligné sur React Native 0.86.3, React 19.2.3,
TypeScript 6.0.3 et AsyncStorage 2.2.0. `expo-doctor` doit rester à 21/21
contrôles passés. Le workspace racine force les mêmes versions React/RN pour
éviter qu'un peer du web ne réintroduise un doublon dans le binaire natif.

Les tests de contrat de la frontière Bearer couvrent les refus, l'expiration et
la sélection de l'identité côté serveur, mais ils ne constituent pas une preuve
d'un JWT Clerk réel accepté par un environnement distant. Cette preuve positive
reste une validation opérationnelle à exécuter avec une session Clerk et une
configuration autorisées avant toute déclaration de release.

Expo SDK 57 fournit le niveau Android compile/target API 36 et
`expo-build-properties` le fixe explicitement dans la configuration de build.
La configuration SDK/Android a été confrontée au premier APK `preview`
signé ; cette preuve n'établit pas encore la conformité des parcours
natifs, de l'authentification complète ou de la publication store.

## Candidate de build EAS

`eas.json` porte trois profils bornés :

- `development` : development client et distribution interne ;
- `preview` : distribution interne, avec APK Android pour le partage d'équipe ;
- `production` : artefact destiné aux stores (AAB Android par défaut).

Le versioning de départ est explicite et local : `version` `1.0.0`,
`android.versionCode` `1` et `ios.buildNumber` `1`. Toute nouvelle release doit
incrémenter les compteurs natifs selon les règles des stores ; aucun compteur
n'est auto-incrémenté ou stocké dans un service distant par cette configuration.
`eas.json` fixe explicitement `cli.appVersionSource` à `local`. Le projet EAS
existant du propriétaire `maxdie` est maintenant rattaché par son
`projectId` explicite dans `app.json` ; aucun deuxième projet ne doit être
créé.

Les identifiants de publication courants sont : slug `clean-my-map`, scheme
`companion`, package Android et bundle iOS `fr.cleanmymap.app`, et projet EAS
`580b0d1c-d5d3-4c42-9b58-4ee7724a6027`. Les anciens identifiants
`cleanmymap-companion` et `fr.cleanmymap.companion` restent documentés dans
l'ADR comme historique ; la disponibilité des anciens ou nouveaux identifiants
sur les stores n'est pas déduite du dépôt.

Les profils EAS doivent recevoir les valeurs réelles de
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` et
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` via l'environnement de build. La clé
`GOOGLE_MAPS_API_KEY` est également requise pour les tuiles Google Maps Android
d'un binaire standalone ; elle est volontairement absente du dépôt. Ces valeurs
ne sont pas des secrets serveur : aucune `service_role` ne doit être fournie à
l'application mobile.

La configuration native conserve uniquement le scheme `companion`, nécessaire
aux retours de l'authentification hébergée Clerk via le plugin Expo Clerk. Les
associations HTTPS Android/iOS et le parcours entrant `/mission/start` ne sont
pas déclarés dans la V1 : aucun routeur mobile ne consomme encore cette URL et
aucun fichier `assetlinks.json` ou `apple-app-site-association` n'est maintenu
pour elle. Les ponts vers les surfaces web restent des ouvertures sortantes
explicites et ne constituent pas du deep linking entrant.

La configuration de localisation est portée par le plugin `expo-location` :
foreground et background iOS, `ACCESS_BACKGROUND_LOCATION`,
`FOREGROUND_SERVICE` et `FOREGROUND_SERVICE_LOCATION` Android. Le mode
`fetch` iOS inutile au suivi GPS a été retiré. Les options Expo SDK 57 devenues
invalides (`newArchEnabled`, `android.edgeToEdgeEnabled` et la clé `splash`
legacy) ont été supprimées ou migrées vers `expo-splash-screen`.
`expo-image-picker` demande les photos mais bloque explicitement le microphone ;
`RECORD_AUDIO` ne fait pas partie des permissions résolues attendues.

## Installation et contrôles courants

Depuis la racine du monorepo :

```bash
npm install
npm run mobile:typecheck
npm run mobile:test
npm run mobile:security
npm run mobile:lint
npm run quality:mobile-coverage
npm start -w apps/mobile
```

Ces commandes vérifient le code et lancent le serveur Expo ; elles ne créent
pas de projet EAS et ne publient aucun artefact.

## Procédure de release reproductible

Les commandes suivantes s'exécutent depuis `apps/mobile` pour la configuration
Expo et depuis la racine pour les contrôles du workspace. Elles ne créent pas
de projet EAS et ne modifient pas les credentials :

```bash
cd apps/mobile
npx expo-doctor
npx expo config --json
npx expo prebuild --no-install --platform android
cd ../..
npm run mobile:typecheck
npm run mobile:test
npm run mobile:security
npm run mobile:lint
npm run quality:mobile-coverage
```

La sortie de `expo config --json` doit conserver `name=CleanMyMap`, le slug et
les identifiants natifs courants, `scheme=companion`, le target Android 36,
les cinq permissions GPS attendues, aucune association HTTPS entrante et aucun
`RECORD_AUDIO`. La présence de `GOOGLE_MAPS_API_KEY` dans l'environnement de
build est nécessaire pour injecter la clé Android Google Maps ; sa valeur ne
doit jamais être committée. Sur Windows, la génération/validation du projet
iOS nécessite macOS ou Linux ; `expo prebuild --platform ios` ne constitue pas
une preuve iOS depuis cet hôte.

Le projet EAS est maintenant rattaché par `app.json`. Après vérification des
variables publiques autorisées (`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_WEB_APP_URL` et `GOOGLE_MAPS_API_KEY`), les
commandes de build sont :

```bash
cd apps/mobile
eas project:info
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
eas build --platform ios --profile production
eas build:list --limit 10
```

Le profil `preview` produit l'APK Android interne demandé pour un premier test
installable. Le profil `production` produit l'AAB Android et l'archive iOS
signés uniquement si les credentials et autorisations sont réellement
disponibles. Ne lancer aucun de ces builds si le projet EAS, les variables ou
les credentials ne sont pas vérifiés ; ne soumettre aucun store depuis cette
procédure.

### Vérification physique obligatoire

Pour chaque artefact, conserver le lien EAS, l'identifiant du build, le SHA de
la candidate et les logs. Sur Android réel, vérifier installation, callback
Clerk, session persistante/changement de compte, refus puis reprise de
permission, suivi foreground/background, verrouillage, kill/relaunch, offline,
replay et finalisation serveur, carte/tracé, participation, création et
publication, signalement avec photo et déconnexion. Sur iOS réel ou runner
Apple adapté, reprendre les mêmes scénarios et contrôler les justifications
de localisation/photos, l'absence de microphone, les signatures et le retour
Clerk. Aucun contrôle statique, test Vitest ou écran Expo Web ne remplace ces
preuves.

## HISTORY — État de release mobile — preuves au 11 octobre 2026

Les éléments de cette section sont conservés pour la traçabilité de la
baseline. Ils sont datés, liés à un artefact et séparés du statut `CURRENT`
ci-dessus. Ils ne doivent pas être recopiés comme preuve d'une nouvelle release.

### Premier build Android

Le projet EAS `@maxdie/clean-my-map` (projectId
`580b0d1c-d5d3-4c42-9b58-4ee7724a6027`) a produit un APK
`preview` **signé et installable** :
[build `beef5909-cd36-4ce9-971e-d3930680ee79`](https://expo.dev/accounts/maxdie/projects/clean-my-map/builds/beef5909-cd36-4ce9-971e-d3930680ee79),
source `fff2ce58a55dc36df7c791e4884f0fd937151bd5`,
version `1.0.0 (1)`, statut `Succeeded`, durée 11 min 49 s.
L'APK transmis (97 560 669 octets) est une archive intègre ; le bundle
`assets/index.android.bundle` (5 579 248 octets, Hermes) est présent.
Il ne s'agit **pas** d'un AAB soumis à Google Play.

EAS a chargé six variables de l'environnement `preview` :
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_WEB_APP_URL`, `EXPO_PUBLIC_WEB_URL`,
`GOOGLE_MAPS_API_KEY`. Ce constat n'atteste pas leur valeur ni
les résultats des appels réseau.

### Diagnostic Android et incident Clerk

Sur appareil réel, ADB a confirmé la présence des deux packages
`fr.cleanmymap.companion` (historique) et `fr.cleanmymap.app` (EAS).
Le démarrage explicite de `fr.cleanmymap.app` a chargé Hermes et affiché
`ReactNativeJS: Running "main"` dans les logs. Un ancien message
`Unable to load script` ne démontre donc pas l'absence du bundle
dans ce nouvel APK.

La cause racine du chargement infini `CHARGEMENT...` a été prouvée
par `ClerkLog` : `code=native_api_disabled`, tandis que
`useAuth().isLoaded` restait faux. Après activation de **Native API**
dans l'instance Clerk **Production**, et enregistrement de l'application
Android `fr.cleanmymap.app`, le **même APK** a atteint l'écran
de connexion. La capture Clerk montrait le Frontend API
`clerk.cleanmymap.fr`, une empreinte SHA-256 et l'allowlist
`clerk://fr.cleanmymap.app.callback`. Le `scheme` Expo reste
`companion` ; leur compatibilité au retour de l'authentification
hébergée est **non testée**, et ne doit pas être inférée.

Pour reproduire le diagnostic sous PowerShell avec un Android branché
en USB et le débogage autorisé :

```powershell
$adb = "$env:LOCALAPPDATA\CleanMyMap-Tools\platform-tools\adb.exe"
& $adb devices
& $adb shell pm list packages | Select-String "cleanmymap"
& $adb logcat -c
& $adb shell am force-stop fr.cleanmymap.app
& $adb shell monkey -p fr.cleanmymap.app -c android.intent.category.LAUNCHER 1
Start-Sleep -Seconds 30
$appPid = (& $adb shell pidof fr.cleanmymap.app).Trim()
if ($appPid) {
  & $adb logcat -d -v threadtime --pid=$appPid |
    Select-String "ClerkLog|ReactNativeJS|native_api_disabled" -Context 2,3
} else {
  & $adb logcat -d -v threadtime |
    Select-String "AndroidRuntime|FATAL EXCEPTION|fr.cleanmymap.app" -Context 2,3
}
```

### Vérifications restantes et signature

| Contrôle | État |
|---|---|
| APK EAS `preview` signé, installé et lancé | **PASS** sur l'artefact daté |
| Clerk Native API Production et écran de connexion | **PASS** après correction distante |
| Hosted auth, retour navigateur, session et JWT accepté par les API/RLS | **NOT_RUN** |
| Tuiles Maps et restrictions Google Cloud effectives | **NOT_RUN** |
| Missions GPS, permissions, écran verrouillé, offline/replay, finalisation serveur | **NOT_RUN** |
| Participation, création d'action, signalement/photo, compte | **NOT_RUN** |
| iOS, publication stores, déclarations de confidentialité, MobSF | **NOT_RUN** |
| Couverture ratchetée | État historique : 36,13 % des lignes pour un seuil à 49,25 % ; aucun run imputable à cet APK |

Le premier keystore EAS `CleanMyMap-Android-Production` a été utilisé
pour signer l'APK, **mais ses mots de passe ont été exposés**.
Sa rotation n'est pas confirmée. Avant toute publication officielle,
renouveler la signature dans les conditions appropriées, puis actualiser
les empreintes : SHA-256 chez Clerk et SHA-1 pour les restrictions
Google Maps Android, en distinguant l'éventuel certificat Google Play
App Signing. Ne jamais publier de JKS, clé privée ou mot de passe.

Le projet Google Cloud `cleanmymap-prod-fr`, sa facturation liée,
Maps SDK for Android activé et la création de l'app Play Console ont
été déclarés, **pas audités comme fonctionnement ou publication**.
Une alerte de budget n'est pas une limite bloquante de facturation.
FCM V1 et le compte de service de soumission Google Play étaient absents
lors du build, sans bloquer ce premier APK autonome.

Les tests terrain d'auth, retour Clerk, cartes, GPS background,
verrouillage, offline, replay, données serveur et parcours natifs,
ainsi que l'audit sécurité MobSF et les procédures stores, restent
nécessaires. **Statut : `CURRENT / ACTIVE DEVELOPMENT —
NOT_PRODUCTION_READY`.** Aucune validation iOS, AAB ni publication
store n'est revendiquée.

## Pourquoi une app native ?

Le suivi GPS fiable en arrière-plan nécessite les APIs natives du système.

L'app utilise notamment :

- permissions de localisation ;
- tâche background ;
- notification persistante Android ;
- stockage local pour les points non synchronisés.

Le navigateur web ne doit pas être considéré comme équivalent pour ce besoin.

## Architecture actuelle

```mermaid
flowchart LR
  WEB[Site Next.js / Clerk] --> SB[(Supabase data plane)]
  APP[Application mobile Expo / React Native / Clerk] --> SB
  CLERK[Clerk identity] --> APP
  CLERK --> SB
  APP --> MISSIONS[missions]
  APP --> GPS[gps_points]
```

Le site et l'application mobile partagent le même produit, le même projet
Supabase, Clerk et les contrats métier nécessaires.

Le runtime mobile n'utilise pas `mission_actions`. Les photos de signalement
passent par les intents et le stockage signé du backend ; le mobile ne crée pas
une table ou un modèle média parallèle.

Les effets métier restent produits par le backend commun : les missions mobiles
réutilisent les projections web existantes pour la gamification, l'impact, les
statistiques et les autres dérivés. Le mobile ne calcule ni ne persiste une
projection parallèle.

## Identité Clerk

Le web et l'application mobile utilisent Clerk comme fournisseur d'identité
principal du produit.

Le LOT 1 de l'ADR-004 est accepté et implémenté : Clerk est l'unique identité
utilisateur de l'application mobile. L'interface utilise l'authentification hébergée
Clerk (Account Portal), avec les méthodes activées dans le compte Clerk.

Le `ClerkProvider` utilise le cache de token sécurisé Expo. Le client Supabase
reste uniquement un data plane : il utilise la clé publique anon pour le
transport et le token de session Clerk courant via `accessToken`. Supabase Auth
n'est pas le fournisseur d'identité de l'application mobile et aucune session
Supabase Auth n'est persistée ou observée.

Le chemin d'identité anonyme a été supprimé. Aucun JWT template legacy n'est
copié dans l'app et aucune clé `service_role` n'est embarquée.

Le contrat RLS lit le `sub` Clerk et le rapproche de `missions.volunteer_id`.
Il est porté par la migration additive du LOT 2A. L'application mobile ne doit
toujours pas être qualifiée de prête pour la production : le background headless
et l'usage opérationnel réel restent à valider. `mission_actions` et la photo
de mission restent hors runtime. Les preuves photo de signalement utilisent le
contrat média canonique. Le
renouvellement Clerk headless est maintenant câblé et couvert par des tests
automatisés ; il doit encore être confirmé sur development build.

Voir `ADR-004`.

## Finalisation de mission : contrat serveur invariant

Le mobile effectue le flush des points GPS, puis une seule mise à jour de la
mission vers `completed` avec `ended_at`. Un trigger `BEFORE UPDATE` serveur
calcule alors la distance Haversine et la durée dans `NEW`, puis la ligne
finalisée est renvoyée par le même `.select()`.

Une mission `completed` ou `cancelled` est terminale pour la surface mobile :
la policy GPS exige l'état `tracking`, et la ligne de mission est verrouillée
pendant la vérification d'un nouvel insert afin de sérialiser une course avec
la finalisation. Le flush conserve son buffer local tant que l'upsert n'est pas
confirmé ; un rejeu portant le même `client_point_id` reste donc idempotent.

La fonction du trigger est `SECURITY INVOKER` avec `search_path = pg_catalog` :
la lecture des `gps_points` reste donc soumise aux RLS de l'appelant. Le
propriétaire Clerk peut finaliser sa mission ; un autre utilisateur et `anon`
ne peuvent pas atteindre cette mise à jour. Les grants mobiles restent limités
à `status`, `started_at` et `ended_at` ; `distance_m` et `duration_s` ne sont
jamais directement inscriptibles par le client. Le mobile ne calcule ni la
distance ni la durée lui-même.

Après une finalisation réussie, l'écran affiche directement la durée, la
distance et l'état de synchronisation renvoyés par le serveur, puis propose de
revenir à l'accueil. Un échec de synchronisation ou de finalisation conserve la
mission active et son suivi.

## Variables d'environnement

Créer :

```txt
apps/mobile/.env
```

à partir de :

```txt
apps/mobile/.env.example
```

Variables publiques attendues :

```txt
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
# Base du site utilisée par les ponts web du shell mobile
EXPO_PUBLIC_WEB_URL
EXPO_PUBLIC_WEB_APP_URL
GOOGLE_MAPS_API_KEY
```

Ne jamais ajouter :

```txt
SUPABASE_SERVICE_ROLE_KEY
```

dans l'app mobile.

## GPS background

Expo Go ne suffit pas pour valider le suivi en arrière-plan.

Utiliser un development build :

```bash
npx expo run:android
```

ou sur macOS :

```bash
npx expo run:ios
```

Le TaskManager demande le token Clerk courant avant toute écriture Supabase.
Lorsqu'un réveil headless intervient après un kill ou une reprise réseau, le
singleton Clerk est initialisé avec le publishable key et le `tokenCache`
SecureStore, puis chargé avant la demande du token. Si aucun token valide n'est
disponible, aucune authentification alternative n'est tentée : les points sont
conservés dans le buffer local sécurisé et seront rejoués lors d'un réveil
ultérieur avec une session valide. Cette résilience automatisée ne remplace pas
la validation terrain ; `mission_actions` demeure hors runtime V1 et pourra être
réintroduit dans une évolution dédiée.

## Structure

```txt
apps/mobile/
├── App.tsx
├── index.ts
├── app.json
├── screens/
│   ├── mobile-shell.tsx
│   └── mobile-shell-contract.ts
├── lib/
│   ├── supabase.ts
│   ├── storage.ts
│   └── tracking-service.ts
├── tasks/
│   └── gps-task.ts
└── types/
    └── mission.ts
```

## Supabase

Ne pas exécuter manuellement le SQL du README dans le dashboard.

Les migrations sont versionnées dans le dépôt.

Workspace CLI actuel :

```txt
apps/web/supabase/
```

Les migrations sont maintenues uniquement dans `apps/web/supabase/`. Voir
`ADR-006` pour la décision de source de vérité.

## CURRENT — Baseline M0 et contrôles avant production

```txt
☑ Identité mobile alignée avec Clerk côté SDK et token provider (LOT 1)
☑ Intégration Clerk Third-Party Auth configurée et RLS missions validées (LOTS 2A/2B)
☑ Ownership des missions protégé par contrat
☑ RLS missions protégée par contrat
☑ RLS gps_points protégée par contrat
☑ `mission_actions` hors runtime V1 ; contrat serveur conservé pour les autres parcours
☑ Finalisation distance côté serveur ou RPC sûre (LOT 2B)
☑ Erreur de calcul de distance traitée
☑ Buffer offline conservé sans token Clerk et rejoué sans flush concurrent doublé
  ☑ Restauration mission active et du tracé après reprise/relaunch testée
  ☑ Fusion serveur/local sans doublons visibles testée
  ☑ Échec de flush/finalisation conservant la mission récupérable testé
  ☑ Écran mission terrain-first : carte dominante, état GPS/sync, métriques live indicatives
☑ Refus de permissions testé
☑ Cohérence identité Clerk → Supabase testée
☑ Cache de token Clerk dans SecureStore configuré (LOT 1)
☑ Renouvellement du token Clerk en background headless (câblage + tests automatisés)
□ Usage opérationnel web et validation production
```

## CURRENT — Validation locale disponible

La validation locale ne remplace pas la preuve Clerk Development, appareil
réel, Supabase autorisé, signature ou store. Les lignes cochées ci-dessus sont
des contrats/tests du dépôt ; les lignes non exécutées dans la preuve de
release historique restent `NOT_RUN`.

```bash
npm run mobile:typecheck
npm run mobile:test
npm run mobile:security
npm run mobile:lint
npm run quality:mobile-coverage
```

## Validation UI native — `agent-device` + émulateur Android

Ce workflow est le point d'entrée de contrôle UI natif pour Codex. Il ne crée
aucune dépendance dans l'application Expo : `agent-device` pilote l'application
installée et lit son arbre d'accessibilité, ses captures et ses journaux. La
documentation Expo confirme que l'outil fonctionne avec une application Expo
déjà lancée et ne requiert pas de bibliothèque `agent-device` dans le projet.

### Pré-requis et préflight

Le préflight ne démarre ni serveur, ni émulateur, ni installation. Il vérifie
Node.js, `agent-device`, `adb`, puis recherche soit un appareil Android
connecté via ADB, soit `emulator` et au moins un AVD :

```bash
npm run mobile:ui:preflight
npm run mobile:ui:preflight:test
```

Le second contrôle exécute les scénarios automatisés de classification du
préflight, dont le cas d'un appareil physique connecté sans `emulator` ni AVD.

L'installation globale d'`agent-device` est une étape d'environnement
appartenant à l'utilisateur, à exécuter une seule fois hors du dépôt :

```bash
npm install -g agent-device@latest
```

Le résultat distingue les trois états suivants :

| État | Conditions | Suite opératoire |
|---|---|---|
| `READY` | `agent-device`, `adb` et au moins un appareil Android connecté | Piloter directement l'appareil physique ; `emulator` et AVD ne sont pas requis. |
| `READY_TO_BOOT` | `agent-device`, `adb`, `emulator` et au moins un AVD, sans appareil déjà connecté | Démarrer l'AVD indiqué par la ligne `NEXT`. |
| `BLOCKED` | Dépendance indispensable absente ou aucun appareil et aucun AVD utilisable | Corriger le blocage ; aucune preuve UI native ne doit être annoncée. |

Un appareil physique connecté via ADB suffit donc pour `READY`, même si le SDK
ne contient pas `emulator` ou aucun AVD. Dans ce cas, vérifier la cible puis
ouvrir l'application sans lancer `boot` ni `shutdown` :

```bash
adb devices -l
agent-device devices --platform android
agent-device open fr.cleanmymap.app --platform android --foreground
```

Si le préflight retourne `UI_PREFLIGHT: BLOCKED`, aucune preuve UI native ne
doit être annoncée. `READY_TO_BOOT` autorise le démarrage de l'AVD indiqué ;
`READY` autorise seulement le contrôle de la cible Android effectivement
connectée.

### Parcours minimal contrôlable

Depuis la racine du monorepo, dans deux terminaux si nécessaire :

```bash
# 1. Diagnostic outillage et cible Android
agent-device doctor --platform android --app fr.cleanmymap.app
agent-device boot --platform android --device <AVD> --headless

# 2. Development build Expo (Expo Go ne prouve pas le GPS background)
npx expo run:android apps/mobile

# 3. Contrôle par l'agent
agent-device open fr.cleanmymap.app --platform android --foreground
agent-device snapshot -i --platform android
agent-device press @eN --settle --platform android
agent-device screenshot artifacts/mobile-ui/android-agir.png --platform android
agent-device logs start
agent-device react-devtools errors --limit 20
agent-device logs path

# 4. Fin de session
agent-device logs stop
agent-device close fr.cleanmymap.app --platform android
agent-device shutdown --platform android --device <AVD>
```

`@eN` est la référence retournée par le snapshot de la session ; elle ne doit
pas être inventée ni conservée comme identifiant durable. Pour une preuve
reproductible, conserver la capture, le SHA contrôlé, le nom de l'AVD, la
commande exécutée et le résultat du snapshot/log. Les captures et journaux
peuvent contenir des données de session : ne pas les publier sans filtrage.

Les contrôles ciblés utilisent des identifiants stables uniquement pour les
points d'entrée nécessaires à ce parcours : `mobile-auth-sign-in`,
`mobile-auth-sign-up`, `mobile-shell`, `mobile-primary-navigation`,
`mobile-tab-act`, `mobile-tab-map`, `mobile-tab-account`,
`mobile-action-start` et `mobile-map-web-bridge`. Les autres éléments restent
contrôlables par leurs rôles et labels d'accessibilité existants ; aucun
identifiant n'est ajouté pour anticiper une fonctionnalité métier.

### Limites de preuve

Une capture ou un snapshot prouvent le rendu et l'interaction observés, pas
l'AuthN/AuthZ serveur, la persistance Supabase ou le calcul GPS final. Une
session Clerk réelle, le GPS background, le verrouillage, le kill/relaunch,
l'offline et la distribution Android/iOS nécessitent leurs validations
spécifiques. macOS reste une cible distincte non engagée. Sur cette machine,
au `2026-11-03`, `agent-device`, `adb`, `emulator` et un environnement Android
ne sont pas disponibles : le parcours UI natif est donc `BLOCKED`, sans capture
de réussite revendiquée.

Références d'outillage : [guide Expo agent-device](https://docs.expo.dev/agents/agent-device/)
et [commandes agent-device](https://oss.callstack.com/agent-device/docs/commands/).

## Référence opérationnelle des cibles et outils mobiles

Cette matrice distingue les cibles du workspace `apps/mobile` du site Web
CleanMyMap. Les commandes sont à lancer depuis la racine du monorepo ; les
variables publiques viennent de `apps/mobile/.env` et ne doivent jamais
contenir de secret serveur.

| Cible | Commande | Ce que la commande prouve | Limite |
|---|---|---|---|
| Metro / Expo Go | `npm run start -w apps/mobile` | Le bundle JavaScript mobile est servi par Metro et peut être ouvert par Expo Go ou un development build. | Expo Go ne prouve pas le runtime natif, le GPS background, le kill/relaunch ou les modules natifs. |
| Metro development client | `npx expo start apps/mobile --dev-client` | Le development build installé peut recharger le bundle Metro. | Nécessite un development build compatible et une cible connectée. |
| Web target Expo | `npm run web -w apps/mobile` | La variante React Native Web du workspace mobile se rend dans un navigateur. | Ce n'est pas `apps/web` et cela ne prouve aucune permission native, aucun GPS background et aucune distribution mobile. |
| Android development build | `npm run android -w apps/mobile` ou `npx expo run:android apps/mobile` | Gradle construit, installe et lance le build Android local. | Requiert Android SDK, Java, un AVD ou un appareil ; les erreurs de configuration native restent à diagnostiquer dans les logs. |
| iOS development build | `npm run ios -w apps/mobile` ou `npx expo run:ios apps/mobile` | Xcode construit, installe et lance le build iOS local. | macOS, Xcode, un simulateur ou un appareil iOS sont requis ; macOS reste une cible distincte non engagée dans la V1. |
| Santé Expo | `npx expo-doctor apps/mobile` | La cohérence déclarée des dépendances et de la configuration Expo est inspectée. | Ce contrôle statique ne remplace pas un build, un appareil ou une validation de store. |

Le site Web produit reste une autre surface : son serveur se lance avec les
commandes documentées par `apps/web`, alors que `npm run web -w apps/mobile`
lance seulement l'adaptation navigateur de l'application mobile. Un lien
mobile vers le site est un pont Web explicite et ne transforme pas cette cible
Web en preuve native.

### Préparer un émulateur Android local

Le SDK Android doit exposer `adb`, `emulator`, `sdkmanager` et `avdmanager` dans
`PATH`. Les chemins d'installation varient selon l'hôte ; ne pas inscrire un
chemin local dans le dépôt. Une préparation typique, à adapter à une image
Android disponible sur la machine, est :

```bash
sdkmanager --list
sdkmanager "platform-tools" "emulator" "<system-image>"
avdmanager create avd -n cleanmymap-api-36 -k "<system-image>" -d "<device-profile>"
emulator -list-avds
emulator -avd cleanmymap-api-36
adb wait-for-device
adb devices -l
```

Le `compileSdk`/niveau Android retenu par Expo et `app.json` reste l'autorité
pour choisir l'image. Ne pas inventer une image, une API ou une clé Google Maps
si l'environnement ne les fournit pas. Le préflight du dépôt vérifie la
présence des outils et d'un AVD/appareil, mais ne télécharge ni SDK ni image.

### Capacités contrôlables avec `agent-device`

La commande `agent-device capabilities --platform android` est la source
d'autorité pour la version installée. Les capacités ci-dessous sont le socle
attendu ; une commande indisponible doit être signalée comme telle au lieu
d'être remplacée silencieusement par une autre preuve.

| Famille | Commandes usuelles | Usage mobile CleanMyMap |
|---|---|---|
| Découverte | `agent-device devices --platform android` ; `agent-device capabilities --platform android` | Trouver l'AVD/appareil réellement sélectionnable et connaître les commandes disponibles. |
| Diagnostic | `agent-device doctor --platform android --app fr.cleanmymap.app` | Vérifier la chaîne agent-device/ADB, le package et les prérequis de session. |
| Cycle émulateur | `boot`, `shutdown`, `device status` | Démarrer, arrêter et diagnostiquer un AVD ; conserver son nom et son API dans la preuve. |
| Cycle application | `open`, `close`, `install`, `reinstall`, `uninstall` | Ouvrir le package `fr.cleanmymap.app`, repartir d'un état propre ou installer un APK local. |
| Arbre UI | `snapshot -i`, `get text`, `get attrs`, `is visible`, `find text` | Inspecter rôles, labels, valeurs, test IDs et références `@eN` accessibles à l'agent. |
| Interaction | `press`, `fill`, `type`, `scroll`, `back`, `home` | Parcourir le shell, les trois onglets, les sous-pages et les retours sans coordonnées fragiles. |
| État appareil | `orientation`, `settings location`, `settings wifi`, `settings mobile-data`, `settings animations`, `hardware-button power` | Reproduire les états utiles au GPS, à la connectivité, à la rotation, au verrouillage et au mouvement. |
| Preuve visuelle | `screenshot`, `record start`, `record stop` | Produire une capture ou une séquence datée ; la capture ne prouve ni AuthZ ni persistance. |
| Journaux | `logs start`, `logs stop`, `logs path`, `logs doctor`, `events` | Consulter les erreurs runtime, événements de session et avertissements sans recopier de secret. |
| Réseau observé | `network dump 25` | Observer les requêtes effectivement journalisées ; une absence de requête n'est pas une preuve universelle. |
| React Native | `react-devtools tree`, `find`, `inspect`, `errors` | Inspecter composants, props, hooks et erreurs de rendu sur un development build. |
| Performance/traces | `react-devtools profile start/stop/report`, `trace start/stop` | Diagnostiquer les commits lents ou les traces lorsque le problème le justifie. |

Exemple de session complète, avec références découvertes dynamiquement :

```bash
agent-device devices --platform android
agent-device capabilities --platform android
agent-device doctor --platform android --app fr.cleanmymap.app
agent-device open fr.cleanmymap.app --platform android --foreground --relaunch
agent-device snapshot -i --platform android
agent-device press @e2 --settle --platform android
agent-device screenshot artifacts/mobile-ui/agir.png --platform android
agent-device logs start
agent-device react-devtools errors --limit 20
agent-device network dump 25
agent-device logs stop
agent-device logs path
agent-device close fr.cleanmymap.app --platform android
```

Pour repartir d'un état d'installation propre avec un APK déjà construit :

```bash
agent-device reinstall fr.cleanmymap.app <chemin-vers-app-debug.apk> --platform android
```

Les références `@eN` sont valables pour la session et l'écran courant. Après
chaque navigation, relancer `snapshot -i` ; ne pas mémoriser une référence
comme contrat de test. Les `testID` durables du shell sont listés dans la
section précédente et restent limités aux points d'entrée nécessaires.

### Capacités iOS et frontière de plateforme

Sur macOS uniquement, la même famille de commandes peut viser un simulateur
iOS :

```bash
agent-device devices --platform ios
agent-device boot --platform ios --device <simulator>
agent-device open fr.cleanmymap.app --platform ios --foreground
agent-device snapshot -i --platform ios
agent-device screenshot artifacts/mobile-ui/ios-agir.png --platform ios
agent-device logs start --platform ios
agent-device close fr.cleanmymap.app --platform ios
agent-device shutdown --platform ios --device <simulator>
```

La disponibilité effective doit être vérifiée par `capabilities` et par le
préflight de l'hôte. Le présent workspace ne transforme pas cette procédure en
engagement iOS, et macOS n'est pas une cible de compatibilité du produit.

### Diagnostics natifs de repli

`agent-device` est l'outil préféré pour les sessions pilotées par Codex. ADB
reste utile pour diagnostiquer l'installation ou récupérer un log brut quand
la session agent-device ne démarre pas :

```powershell
adb devices -l
adb shell pm list packages | Select-String "fr.cleanmymap.app"
adb logcat -c
adb shell am force-stop fr.cleanmymap.app
adb shell monkey -p fr.cleanmymap.app -c android.intent.category.LAUNCHER 1
adb logcat -d -v threadtime | Select-String "AndroidRuntime|FATAL EXCEPTION|ReactNativeJS|ClerkLog"
adb exec-out screencap -p > artifacts/mobile-ui/adb-fallback.png
```

Cette voie de repli n'est pas une nouvelle harness de test : elle sert aux
diagnostics ponctuels et ne remplace pas l'inspection d'accessibilité,
l'isolation de session ou les preuves `agent-device`. Les sorties peuvent
contenir des URLs, identifiants ou messages d'authentification ; les filtrer
avant conservation.

### Outils de build et de distribution

| Outil | Commandes | Portée |
|---|---|---|
| Expo CLI | `npx expo start`, `npx expo run:android`, `npx expo run:ios`, `npx expo-doctor` | Développement Metro, builds natifs locaux et diagnostic Expo. |
| Android SDK / Gradle | `adb`, `emulator`, `sdkmanager`, `avdmanager`, `./gradlew` dans `apps/mobile/android` | Émulateur, installation, logs et build Android local ; les commandes Gradle brutes restent un dernier recours derrière Expo. |
| Xcode / simctl | `xcrun simctl list`, `xcrun simctl boot <UDID>`, `xcrun simctl io booted screenshot <file>` | Simulateur iOS sur macOS uniquement ; `agent-device` reste préférable pour la session agent. |
| EAS | `eas project:info`, `eas build --platform android`, `eas build --platform ios` | Build cloud et distribution ; nécessite un compte, un projet et des credentials réels. Ce n'est pas une preuve UI locale. |
| Agent-device MCP | `agent-device mcp` | Option d'intégration structurée pour un client MCP ; le terminal CLI reste le chemin par défaut et ne requiert aucune dépendance Expo. |

Ne jamais lancer un build EAS, une soumission store ou une synchronisation de
credentials comme simple contrôle UI. Ces actions nécessitent une demande et
une preuve distinctes, conformément aux limites de production du mobile.

## Snapshot de couverture Mobile et trajectoire vers 80 %

Mesure locale canonique du `2026-11-03`, sur le SHA `7a7862bee…` :

| Métrique | Mesure actuelle | Preuve |
|---|---:|---|
| Fichiers de tests | 41 | `npm run quality:mobile-coverage` |
| Tests | 282/282 | Vitest Mobile |
| Statements | 91,07 % | rapport V8 attribué au SHA |
| Branches | 85,90 % | rapport V8 attribué au SHA |
| Fonctions | 84,51 % | rapport V8 attribué au SHA |
| Lignes | 96,31 % | rapport V8 attribué au SHA |

Le résultat canonique est `COVERAGE_STATUS: PASS`, avec politique et
enforcement `OBSERVE`. Cette mesure ne modifie ni les exclusions, ni les
seuils, ni la baseline ; elle ne constitue pas une preuve appareil ou
production.

La trajectoire vers un objectif de pilotage à 80 % sur chaque métrique est :

1. conserver `npm run quality:mobile-coverage` comme unique producteur et
   rattacher chaque résultat à son SHA ;
2. maintenir la couverture des contrôleurs, du shell, du stockage et du GPS
   déjà couverts, puis ajouter les scénarios runtime manquants sur les erreurs,
   permissions, reprise et changement d'identité ;
3. compléter les preuves UI natives sur émulateur Android puis iOS lorsque les
   outils et les contrats de plateforme seront disponibles ;
4. re-mesurer les quatre métriques avec les exclusions existantes et ne proposer
   un ratchet que sur une série de mesures stables et revue.

L'objectif de 80 % décrit une trajectoire de gouvernance ; il ne transforme pas
le statut `OBSERVE` actuel en gate et ne justifie aucune métrique artificielle.

La baseline M0 couvre désormais par tests unitaires et contractuels :

- restauration d'une mission active ;
- stockage offline ;
- replay du buffer GPS, y compris le flush concurrent sérialisé ;
- refus des permissions GPS ;
- finalisation d'une mission et conservation après erreur ;
- erreurs Supabase ;
- propriété de mission via RLS ;
- cohérence identité Clerk → Supabase ;
- absence d'écriture client directe des métriques dérivées.

La synchronisation mobile est aussi couverte sur ses branches de reprise :

- les ajouts et suppressions de réconciliations sont sérialisés par propriétaire
  Clerk, et une reprise concurrente du même propriétaire est coalescée ;
- un changement de compte avant l'émission réseau ou pendant la résolution du
  client interrompt l'opération sans lire ni envoyer le namespace précédent ;
- un point GPS conserve le même `client_point_id` entre envoi direct, buffer,
  redémarrage et rejeu après perte d'acquittement ; les anciens points sans cet
  identifiant reçoivent une identité persistée avant leur première reprise ;
- la lecture du tracé conserve l'identité client des points historiques, tandis
  que les métriques `distance_m` et `duration_s` restent dérivées côté serveur.

Ces tests unitaires, le contrat SQL statique et les contrôles RLS ne remplacent
pas une exécution PostgreSQL à deux sessions. Tant que cette exécution n'est pas
disponible dans l'environnement autorisé, la preuve doit rester marquée
`DB_SEMANTICS_NOT_EXECUTED`.

Le contrat du shell protège aussi les trois destinations V1 et les ponts vers les
surfaces web existantes.
