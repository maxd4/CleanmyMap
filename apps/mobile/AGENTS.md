# Gouvernance locale — `apps/mobile`

Héritage : gouvernance racine → ce périmètre mobile. `apps/mobile` est
`CURRENT / ACTIVE DEVELOPMENT`, pas `LEGACY` : c'est une application
déployable distincte du web, officiellement rouverte par le lot M0, mais
`NOT_PRODUCTION_READY`. La baseline mobile reste minimale et n'ajoute pas de
fonctionnalité métier profonde ni de parité avec le web.

## Périmètre V1

La V1 mobile est destinée aux bénévoles terrain et reste volontairement petite.
Le site web demeure la surface complète du produit et évolue indépendamment.
Le frontend mobile ne cherche pas à reproduire le site ; la V1 couvre le mode
activité GPS live avec carte et tracé temps réel, la reprise/offline, la
finalisation serveur, les contacts d'urgence et les trois parcours métier
natifs du bloc Agir.

Les autres capacités mobiles doivent réutiliser les contrats, données et
services communs existants. Aucun package partagé générique, second modèle
métier mobile ou système de gamification parallèle ne doit être créé pour la
V1.

## Shell V1

Le shell mobile expose uniquement trois destinations persistantes et accessibles
dans une barre inférieure native unique : `Agir`, `Carte` et `Compte`. Les icônes
de cette barre viennent exclusivement de `lucide-react-native`, avec la version
Expo-compatible de `react-native-svg`, et l'inset de la `SafeAreaView` protège
les appareils à zone sûre. Le registre explicite
`MOBILE_DESTINATION_REGISTRY` conserve aussi les blocs web futurs sans les
exposer avant leur implémentation ; la navigation primaire reste plafonnée à
cinq destinations.

`Agir` présente les entrées terrain `Démarrer une action`, `Rejoindre une
action`, `Créer une action` et `Signaler un déchet`.
Le parcours `Rejoindre une action` est natif : liste des actions futures
publiées, recherche, détail, inscription, suivi, annulation, invitations,
actions passées éligibles et demande de rattachement. `Créer une action` reprend
les quatre sections du contrat web et confirme chaque mutation par le serveur.
`Signaler un déchet` utilise `trash_spotter_spots`, les catégories, la position
actuelle ou manuelle, `Mes observations` et les intents média canoniques. Une
réponse partielle reste reprenable et ne devient jamais un succès métier local.

`Démarrer une action` vérifie les permissions GPS, crée une mission `pending`
owner-scoped avec le `sub` Clerk via Supabase, puis réutilise `startTracking`
pour passer la mission à `tracking` et afficher l'écran mission active. Le
grant INSERT et la policy RLS limitent l'écriture mobile à `volunteer_id` et
`label` ; le client ne contrôle donc ni l'identité effective ni les métriques
  dérivées. La carte live restaure les points `gps_points` owner-scoped, fusionne
  le tracé UX local et reprend le suivi foreground ; ce suivi ne persiste ni
  points ni métriques dans Supabase. Le compte est natif et consomme la
  projection privée `/api/mobile/account`, tandis que les surfaces web
  `/actions/map`, `/politique-confidentialite`, `/mentions-legales` et `/contact`
  restent des ponts ciblés lorsque le contrat canonique le demande ;
le mobile ne crée pas de deuxième messagerie ni de deuxième modèle métier. Les
trois parcours Agir sont des sous-vues : un changement d'onglet ou un retour
arrière conserve les composants montés, leurs états et les brouillons locaux.
Compte est un hub de sections pour le profil, l'activité et les notifications,
les préférences, la recherche, l'aide/feedback et les informations légales ; un
lien vers une surface web est explicitement présenté comme tel et ne devient
pas un faux réglage natif.
Avant les dialogues système, le suivi GPS présente une rationale native
décrivant la collecte, l'arrière-plan, l'usage serveur, la transmission Clerk
et la reprise hors ligne. Les clés locales de mission, buffer, tracé et
réconciliation sont owner-scoped par `userId` Clerk ; une identité différente
ne peut ni lire ni synchroniser les données persistées d'une autre identité.
Compte expose aussi la demande de suppression via
`/api/mobile/account/deletion-request`, qui réutilise `contact_requests` et
retourne séparément l'identifiant, l'état de notification et le traitement
effectif. La page publique `/contact` reste le relais après désinstallation.

Le workspace `apps/mobile`, son `package.json`, cet `AGENTS.md` et ses contrats
essentiels restent présents tant qu'une décision d'architecture explicite ne
les retire pas simultanément avec les contrats, la documentation et les
consommateurs concernés.

## Identité et accès

- Clerk est l'identité canonique web et mobile ;
- conserver `ClerkProvider`, `useAuth`, l'authentification hébergée Clerk et
  le `tokenCache` sécurisé ;
- transmettre le token Clerk à Supabase via Third-Party Auth ;
- fonder les RLS `missions` / GPS sur le `sub` Clerk ;
- ne pas réintroduire Supabase Auth ou une identité anonyme comme fournisseur
  d'identité ;
- ne jamais embarquer `service_role` dans l'application mobile.

Les appels natifs de participation passent par `/api/mobile/actions` et ses
sous-routes. Les mutations de création/édition/publication Actions et de
signalement réutilisent la passerelle bornée partagée des routes `/api/actions`
et `/api/spots`, ainsi que les routes de lecture et d'intents `/api/signalements`.
Cette frontière vérifie explicitement le JWT Clerk de session
porté par `Authorization: Bearer` avec `clerkClient().authenticateRequest`,
puis réutilise les services métier et les décisions AuthZ serveur existants.
`auth()` de Next et un Bearer mobile ne sont donc pas considérés comme
interchangeables par hypothèse. Les tests de frontière couvrent l'absence de
token, l'expiration, l'utilisateur différent et les rôles autorisé/interdit.

## Contrats finalisés et invariants

L'identité Clerk, les RLS et la finalisation de `distance_m` et `duration_s`
par le trigger serveur courant sont finalisées et restent invariantes pendant le
développement actif. Le client mobile ne doit pas reprendre le calcul ou
l'écriture directe de ces métriques.

## Capacités encore ouvertes et limites de production

Les sujets suivants restent hors périmètre V1 et nécessitent une validation
explicite avant toute évolution :

- background headless ;
- `mission_actions` reste hors runtime : une mission GPS liée n'est jamais une
  participation confirmée. Les photos de signalement sont prises en charge via
  le contrat média existant ; aucune photo de mission ni table `mission_actions`
  n'est réintroduite ;
- validation opérationnelle ;
- évolution future du produit mobile, après validation de chaque lot.

Le socle de release courant est Expo SDK 57 avec React Native 0.86.3,
React 19.2.3, TypeScript 6.0.3 et AsyncStorage 2.2.0. Une release native exige
un contrôle `npx expo-doctor` à 21/21, un projet EAS réel, les credentials
autorisés, la clé Google Maps fournie par l'environnement et un artefact signé
vérifié. Aucun `projectId`, certificat, résultat de build ou statut store ne
doit être inventé ou déduit de la seule configuration du dépôt.

La configuration SDK 57 cible Android API 36 par son contrat Expo. Les
permissions doivent rester minimales : la preuve photo n'active pas le
microphone et `RECORD_AUDIO` est bloqué dans la configuration Expo résolue.
La localisation background reste soumise à la déclaration Play, à la
confidentialité et à une validation sur appareil réel.

Une évolution sur ces sujets doit d'abord recevoir une décision explicite et
réaligner les contrats, tests et documentation concernés. Ne pas transformer
une capacité ouverte en fonctionnalité finalisée par simple modification de ce
fichier.

Validation mobile ciblée :

```bash
npm run mobile:typecheck
npm run mobile:test
npm run mobile:security
npm run mobile:lint
```

La couverture ratchetée du mobile est mesurée par `mobile-validation` sur
chaque push vers `main` et chaque Pull Request ciblant `main`. Elle reste aussi
disponible en FULL et en pré-release de code avec :

```bash
npm run quality:mobile-coverage
```

La complexité/longueur et les fichiers top-heavy réutilisent les moteurs
communs du dépôt ; ils ne doivent pas être clonés dans `apps/mobile`.
