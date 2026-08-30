# Validation transverse des interactions CleanMyMap

Campagne E2E n°1 exécutée le 29 août 2026 depuis `main` (`98a77b3957dc9f66254220fee329fa98f81fb1bd`), avec serveur local ponctuel et Playwright. Les surfaces hors périmètre n’ont pas été rejouées.

## Doctrine et niveau de preuve

La règle d’audit est : lecture publique maximale ; authentification au moment exact où une identité ou une autorisation devient nécessaire. Toute mutation reste protégée côté serveur par les contrôles AuthN/AuthZ existants.

Les colonnes ne constituent pas un feu vert :

- `PAGE` signifie que la route et la surface existent dans le code ou le registre.
- `INTERACTION` signifie que le câblage UI/API ou un contrat local a été retrouvé dans le code ; cela ne remplace pas un clic réel.
- `END_TO_END` exige la vérification de l’effet réel : donnée persistée, email effectivement remis, redirection atteinte, état métier modifié, fichier généré/téléchargé ou upload finalisé. Aucun `END_TO_END_OK` n’est attribué sans preuve identifiée dans le registre de campagne ci-dessous.
- Un toast, un état React ou une réponse HTTP isolée ne suffit pas pour `END_TO_END`.

## Politique d’exécution locale — Docker/Supabase strictement on-demand

Depuis la campagne n°2, Docker et Supabase local ne font pas partie des
pré-requis généraux de validation. Toute validation qui ne nécessite pas une
écriture ou une relecture locale réelle doit être exécutée sans démarrer ces
services : tests unitaires, contrats API, typecheck, lint, pages publiques,
navigation et exports dont la source de données est déjà disponible sans
persistence locale.

Les E2E avec persistence, Storage ou contrôle d’ownership sont regroupés en
campagnes ponctuelles. Le cycle canonique est :

1. effectuer les pré-contrôles sans Docker/Supabase ;
2. démarrer Docker uniquement si le runner en a besoin, puis démarrer une seule
   instance Supabase locale depuis `apps/web/supabase` et ses migrations/seed
   canoniques ;
3. exécuter dans une seule invocation Playwright tous les scénarios de la
   campagne concernée ;
4. laisser chaque campagne exécuter son teardown déterministe et relire
   l’absence des données E2E ;
5. arrêter Supabase puis Docker uniquement si le runner les a lui-même démarrés
   et qu’aucun conteneur préexistant ne risque d’être interrompu.

Le runner ponctuel de la campagne n°2 est
`node e2e/run-campaign-2-local.mjs`. Il regroupe Gate A (signalement sans média),
Gate B (Storage média, relecture propriétaire et AuthZ négatif) et le cleanup
dans une seule session Playwright. Les clés restent uniquement dans
l’environnement du processus ; aucune sortie de statut Supabase n’est
recopiée dans les logs. Si Docker ou Supabase sont déjà actifs avant le
lancement, le runner les conserve afin de ne pas interrompre un autre chantier
local ; cet état doit être signalé comme environnement préexistant, pas comme
un démarrage/arrêt possédé par la campagne.

La commande générique `npm run test:e2e` ne doit pas être utilisée comme
validation courante implicite : elle peut sélectionner des projets nécessitant
Clerk et Supabase. Les validations publiques et sans persistence doivent être
appelées explicitement ; les mutations locales doivent passer par leur runner
de campagne avec acquisition et restitution contrôlées de l’environnement.

### Candidats de déplacement vers GitHub Actions

| E2E ou famille | dépendance | cible CI | condition de déplacement |
|---|---|---|---|
| smoke public, routes publiques et contrôles de navigation | serveur Next ; pas de mutation | PR/push, sans Docker | exécuter avec une source de lecture déterministe ou des réponses de test ; ne jamais dépendre d’une base distante de production |
| exports CSV/GeoJSON/PNG de `/actions/map` | navigateur, génération de fichiers, données publiques de test | PR/push, sans Docker si la source est embarquée/isolée | comparer contenu, format, MIME et taille comme dans `E2E-1B-EXPORTS` |
| campagne n°1D — group join, idempotence, leave, relecture | Supabase local, fixture, Clerk Testing | workflow E2E ponctuel ou nightly | runner Linux avec Supabase disposable, seed canonique, utilisateur Development dédié, secrets CI et teardown vérifiable |
| campagne n°2 — signalement, Storage, owner readback, AuthZ | Supabase local, Storage, Clerk Testing, fixture image | workflow E2E ponctuel ou nightly | même stack isolée, bucket éphémère, fixture marker, vérification objet/metadata et suppression déterministe |
| déclaration complète et médias `/actions/new` | Supabase, Storage, géométrie, Clerk, éventuellement services externes | workflow E2E lourd/nightly | compléter d’abord le scénario et les preuves locales ; aucune écriture distante depuis le workflow sans environnement disposable |
| messagerie, communauté, rapports/admin | multi-utilisateurs, RLS, Storage, rôles, audit | workflows E2E dédiés/nightly | harness multi-session, fixtures par rôle, isolation de données et assertions d’audit avant activation CI |

Les E2E authentifiés et persistants sont donc de bons candidats CI, mais ne sont
pas déclarés « déplacés » tant que GitHub Actions ne fournit pas réellement la
paire Clerk Development, Supabase disposable, les fixtures et le teardown. La
présence d’un workflow vert ou d’un build ne constitue pas une preuve de
persistence métier.

## Matrice canonique

| surface | route | acteur | interaction | auth attendue | effet réel | PAGE | INTERACTION | END_TO_END | dépendances | anomalie |
|---|---|---|---|---|---|---|---|---|---|---|
| Navigation globale | `/`, toutes routes publiques | anonyme/connecté | liens principaux, CTA, retour, alias et redirections | aucune pour lire/naviguer ; session seulement pour les cibles privées | route cible réellement atteinte, sans mur prématuré | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `app-navigation-ribbon`, `page_site/INDEX.md`, `proxy.ts` | `E2E-3A-NAVIGATION` : routes publiques, CTA `/actions/map → /methodologie` et alias `/open-data → /sections/open-data` atteints. |
| Recherche globale | toutes pages avec recherche | anonyme/connecté | saisir, sélectionner un résultat | aucune pour résultats publics ; auth à l’ouverture d’une cible privée | redirection vers la bonne fiche/section | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `GlobalSearch`, `router.push` | `E2E-3A-GLOBAL-SEARCH` : requête publique `Méthodologie`, sélection du résultat puis URL finale `/methodologie`. |
| Authentification | `/sign-in`, `/sign-up` | anonyme | connexion, inscription, `returnTo` | précisément au moment de l’accès privé ou de la mutation | session Clerk établie puis retour vers la cible, onboarding si nécessaire | Présente | Contrats Clerk | NON PROUVÉ | Clerk, `proxy.ts`, onboarding | Le retour après auth et le cas session indisponible restent non vérifiés navigateur. |
| Préférences d’interface | toutes pages | anonyme/connecté | langue, thème, mode d’affichage, préférence locale | aucune pour les préférences locales ; auth seulement si persistance compte | cookie/local storage ou préférence serveur effectivement relue | PAGE_OK | INTERACTION_OK | END_TO_END_OK (locale) | `site-preferences-provider`, `site-preferences-locale-sync`, cookies | `E2E-3A1-PREFERENCES-SELECT-RELOAD` et `E2E-3A1-PREFERENCES-LEGACY` : `en` sélectionné puis relu dans localStorage, cookie et `document.lang` après reload ; cookie serveur `en` initial ; migration localStorage `en` sur default serveur `fr` stabilisée sans nouvelle navigation après la migration. Thème non exposé par l’UI. |
| Consentement cookies | toutes pages | anonyme | accepter/refuser/ouvrir la politique | aucune | état de consentement conservé et bannière masquée au rechargement | PAGE_OK | INTERACTION_OK | END_TO_END_OK | cookie/local storage | `E2E-3A-COOKIE-CONSENT-ACCEPT` et `E2E-3A-COOKIE-CONSENT-REJECT` : choix et cookie analytics relus après reload, bandeau absent. |
| Explorer | `/explorer`, `/en` | anonyme/connecté | filtres, sélection de carte/fiche, liens de lecture | aucune pour lecture publique | exploration et redirection vers une fiche cohérente | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `getSafeAuthSession`, `getServerLocale`, `getServerDisplayModePreference`, `getNavigationSpacesForProfile`, `BLOCK_THEME` | `E2E-3A1-EXPLORER` : page locale `200`, heading `Sommaire`, 5 cartes rendues sans erreur page ; sélection d’un lien de carte puis URL finale `/actions/new`. Tous les `space.id` retournés par `FIXED_SPACE_ORDER` sont couverts par `BLOCK_THEME`. |
| Carte des actions | `/actions/map` | anonyme/connecté | filtres date/zone/catégorie, couches, popup, géométrie, reset, rechargement | aucune pour lecture et export local | données publiques approuvées affichées, sélection synchronisée, carte lisible | PAGE_OK | INTERACTION_OK | BLOCKED_DATA | `/api/actions/map`, `/api/actions/map/initial-nearest`, MapLibre, géoloc fallback | `E2E-3A-MAP-INTERACTIONS` : zone, période, catégorie et reset modifiés puis relus dans l’UI ; journal/sélection non disponibles avec la réponse publique observée. Exports non rejoués (`E2E-1B-EXPORTS`). |
| Export carte | `/actions/map` | anonyme/connecté | CSV, GeoJSON, PNG | aucune | fichier local généré et contenu conforme aux filtres | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `actions-map-export-button`, Blob/html-to-image | Les trois fichiers ont été téléchargés et inspectés contre les 10 identifiants retournés par `/api/actions/map` (`E2E-1B-EXPORTS`). |
| Documentation et open data | `/methodologie`, `/open-data`, `/sections/open-data` | anonyme | ancres, accordéons, liens et téléchargements documentaires | aucune | contenu/ressource publique atteint et téléchargée | PAGE_OK | INTERACTION_OK | END_TO_END_OK | pages docs, `/api/documentation/[slug]` | `E2E-3A-OPEN-DATA-DOCS` : ancres `/methodologie#methodologie-carte-actions` et `/sections/open-data#formats` atteintes ; aucun contrôle de téléchargement documentaire n’est exposé, donc aucun fichier n’a été artificiellement déclaré. |
| Annuaire public | `/sections/annuaire`, `/partners/network` | anonyme/connecté | recherche, filtres, tags, pagination, vue carte/réseau, drawer, focus carte, email/site | aucune pour l’annuaire publié ; auth seulement pour une action privée | annuaire accepté chargé depuis le service public, sélection et lien externe corrects | PAGE_OK | NON PROUVÉ | NON PROUVÉ | `use-annuaire-logic`, annuaire UI, `/api/partners/published-directory` | Le mur `disabled` de l’annuaire a été retiré et les deux routes rendent leurs contrôles en navigateur (`PW-1B-PUBLIC-ROUTES`) ; service publié local vide (`count=0`), donc recherche sur données publiées, fiche et liens externes non prouvés. |
| Communauté, lecture | `/sections/community`, `/community` | anonyme/connecté | onglets à venir/mes événements/passés, filtres, cartes, partage/copie | aucune pour contenu explicitement public ; auth au RSVP ou à la création | événements visibles et navigation vers le bon contexte | Présente | Câblage source | NON PROUVÉ | `/api/community/events`, clipboard, partage | **Mur suspect / contrat à clarifier :** section `disabled` et GET événements authentifié, malgré l’objectif de lecture publique maximale. |
| Communauté, RSVP | `/sections/community` | connecté | répondre oui/peut-être/non, annuler, relire “mes événements” | auth au clic de RSVP/annulation, pas avant la lecture | RSVP upserté dans la base et progression mise à jour pour “oui” | Présente | Contrat API + câblage | NON PROUVÉ | `/api/community/rsvps`, Supabase/RLS | E2E à faire avec relecture depuis une autre vue/session. |
| Communauté, création | `/sections/community` | connecté, organisateur selon état | créer événement, actualiser, copier kit/rappel | auth au submit ; rôle/état contrôlé serveur | événement persisté, visible dans la liste et partageable | Présente | Câblage source | NON PROUVÉ | `/api/community/events`, email/notifications éventuels | Le formulaire dépend d’une section actuellement bloquée aux anonymes. |
| Météo | `/sections/weather`, `/sections/guide` | anonyme/connecté | localisation, suggestions, prévisions, onglets jours, reset | aucune pour météo ; permission géoloc seulement à l’usage | prévision et localisation affichées, onglets relus après sélection | PAGE_OK | INTERACTION_OK | END_TO_END_OK | Open-Meteo, `/api/geo/*`, storage localisation | `E2E-3B-WEATHER` : Open-Meteo réel, sélection Lyon, changement de jour et refus contrôlé de géolocalisation ; aucun contrôle reset n’est exposé. |
| Assistant itinéraire | `/sections/route` | anonyme puis connecté si nécessaire | contraintes publiques, puis demande de recommandation | aucune pour lire/remplir ; auth au clic de recommandation | formulaire public conservé puis cible Clerk atteinte au moment protégé | PAGE_OK | INTERACTION_OK | BLOCKED_AUTH | `/api/route/recommend`, Clerk, géocodage | `E2E-3B-ROUTE` : aucune mutation avant action ; le lien explicite mène à `/sign-in?redirect_url=%2Fsections%2Froute`. L’ancien POST protégé automatique a été supprimé. |
| Recyclage | `/sections/recycling` | anonyme puis connecté pour données personnalisées | assistant question/réponse, filtres/lecture des statistiques | lecture guide publique ; auth seulement pour breakdown personnel | réponse pédagogique locale ; breakdown personnel reste protégé | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `/api/recycling/breakdown`, données actions/map | `E2E-3B-RECYCLING` : question publique répondue localement malgré l’indisponibilité/401 possible du breakdown privé ; aucune mutation métier. |
| Guide et checklist | `/sections/guide`, `/learn/bonnes-pratiques` | anonyme puis connecté | alias, onglets/thèmes, liens d’apprentissage, checklist locale si exposée | lecture sans auth ; auth au premier enregistrement serveur de checklist | URL du thème relue après reload ; checklist canonique non exposée sur ces pages | PAGE_OK | INTERACTION_OK | END_TO_END_OK (thème/alias) | `/sections/[sectionId]`, page bonnes pratiques, local state | `E2E-3B-GUIDE-CHECKLIST` : `/sections/guide → /sections/weather`, thème `compost` conservé dans l’URL après reload ; checklist locale non déclarée comme validée. |
| Quiz pédagogique | `/learn/ecole`, `/learn/sentrainer` | anonyme puis connecté | ouvrir la démo, répondre, bilan/score, recommencer | quiz et mesure pédagogique publics ; auth au moment de sauvegarder progression personnelle | score et bilan client atteints, replay public relancé, aucune progression distante créée | PAGE_OK | INTERACTION_OK | END_TO_END_OK (démo locale) | quiz client, `/api/gamification/quiz/progress`, métriques pédagogiques | `E2E-3B-QUIZ` : cinq questions démo, synthèse avec score puis nouvelle session ; seules les traces locales de page sont présentes, aucune requête métier non sûre. |
| Contact RGPD | `/contact` | anonyme/connecté | choisir demande, formulaire, mode automatique ou manuel | aucune ; identité optionnelle ; auth non requise | automatique : demande persistée + tentative email ; manuel : client mail prérempli | Présente | Contrat API + câblage | NON PROUVÉ | `/api/contact`, contact store, Resend, `mailto:` | `201 queued` ne prouve ni remise ni lecture email ; vérifier les deux modes séparément. |
| Newsletter | `/` et composants newsletter publics | anonyme/connecté | email, consentement, honeypot, submit | aucune | abonnement upserté dans `newsletter_subscriptions` | Présente | Contrat API + câblage | NON PROUVÉ | `/api/newsletter/subscribe`, Supabase server | Pas d’email de confirmation ; vérifier la ligne réellement persistée et l’idempotence. |
| Signalement de contenu illicite | `/signaler-contenu-illicite` | anonyme/connecté | URL/type/identité/raison, preuve de bonne foi, submit | aucune ; attribution Clerk optionnelle | signalement persisté, tracking ID et notifications d’accusé/creator | Présente | Contrat API + câblage | NON PROUVÉ | `/api/legal-content-reports`, emails | Tester cas anonyme, connecté, email en échec et absence de pièce jointe. |
| Feedback bug/idea | `/sections/feedback` | anonyme puis connecté | choisir type, saisir titre/description, soumettre, filtrer le statut | auth au submit, car API protégé | demande persistée puis visible dans l’inbox créateur | Présente | Contrat API | NON PROUVÉ | `/api/community/bug-reports` | **Anomalie UX :** le formulaire public peut être rempli avant un 401 au submit ; ajouter un parcours d’auth tardive à la campagne, sans corriger dans cette passe. |
| Rejoindre une action, lecture | `/sections/rejoindre-un-formulaire` | anonyme/connecté | recherche, filtres statut/zone/période, tri, reset, recharge | aucune pour la liste publique ; auth seulement pour historique privé | liste publique joinable cohérente et historique seulement si session | PAGE_OK | INTERACTION_OK | NON PROUVÉ | GET `/api/actions/group-join`, `/api/actions/map` | La fixture locale `E2E_FIXTURE:group-join:v1` est visible anonymement et relue par API ; les filtres complets ne sont pas couverts par cette campagne. Preuve : `E2E-1D-GROUP-JOIN`. |
| Participation à une action | `/sections/rejoindre-un-formulaire` | connecté | rejoindre, quitter, relire l’état | auth exactement au clic de participation/sortie | ligne de participation et état métier persistés | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `/api/actions/group-join`, `/api/actions/[actionId]/group-join`, RLS/progression | Fixture locale marquée, POST UI `200` → `pending`, relecture persistée, seconde tentative idempotente sans nouvelle ligne, DELETE → `cancelled`, relecture `joined=false` et historique `cancelled`. Preuve : `E2E-1D-GROUP-JOIN`, fixture `6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71`. |
| Revue des participants | `/sections/rejoindre-un-formulaire`, `/actions/history` | organisateur/admin autorisé | ouvrir file, accepter/refuser/ajouter un participant | auth + ownership/rôle au chargement et à chaque mutation | décision auditée, participant et statut réellement mis à jour | Présente | Contrats GET/PATCH/POST | NON PROUVÉ | `/api/actions/[actionId]/group-join`, audit | Vérifier qu’un simple membre ne voit ni ne modifie la file. |
| Entrée déclaration | `/actions/new`, `/declaration` | anonyme puis connecté | choisir déclaration rapide/complète, reprendre ou abandonner un brouillon | auth au submit ou à la reprise si identité requise ; choix et aide devraient être publics | mode sélectionné et navigation vers le bon formulaire | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `ActionDeclarationEntryFlow`, Clerk context-only, CTA sign-in/up | Choix public, saisie préparatoire, POST anonyme protégé `401`, CTA `Se connecter et reprendre`, authentification Clerk officielle puis restauration des champs prouvés. Preuve : `E2E-1D-ACTION-NEW`. |
| Brouillon déclaration simple | `/actions/new`, `/declaration-simple` | anonyme puis connecté | saisir identité/lieu, enregistrer brouillon, continuer | auth au premier enregistrement serveur ; brouillon local possible sans auth | brouillon local ou fiche serveur créée au submit | Présente | Câblage source + API | NON PROUVÉ | local storage, `/api/actions`, participant picker | Distinguer conservation locale et persistance métier ; aucune preuve de reprise réelle. |
| Déclaration complète | `/actions/new` | connecté après formulaire public éventuel | champs, tri, date, quantité, géométrie, aide intelligente, confirmation | auth au submit ; contrôles serveur ownership/state | action créée dans la base, état et lien de partage retournés | Présente | Contrat POST + câblage | NON PROUVÉ | `/api/actions`, géocodage, vision, Supabase | Prioritaire ; la réponse positive UI n’est pas la persistance. |
| Exports et partage de déclaration | `/actions/new` après création | anonyme/connecté | CSV/PDF/image/bundle local, copier lien/texte, partage natif, replay | aucune pour l’export local ; auth si replay d’historique privé | fichier/clipboard/share réellement disponible et lien pointe sur la bonne action | Présente | Câblage source | NON PROUVÉ | `action-declaration-export-picker`, Blob, Web Share | Vérifier contenu, nom, encodage et fallback clipboard/share. |
| Médias de déclaration | `/actions/new`, `/signalement` | connecté | sélectionner/retirer photos, traitement vision, submit | auth au submit et upload ; serveur vérifie action/propriétaire | médias intentés, uploadés puis finalisés, rattachement à l’action | Présente | Contrats media + câblage | NON PROUVÉ | `/api/signalements/[id]/media/intents`, Supabase Storage, finalize | Prioritaire : chaîne en quatre étapes à vérifier, y compris retry partiel. |
| Signalement terrain | `/signalement` | anonyme puis connecté | choisir spot/lieu propre, géolocaliser, photos, envoyer | permission géoloc à l’usage ; auth au submit certifié | observation créée, géométrie et photos persistées, visible dans “mes observations” | PAGE_OK | INTERACTION_OK | NON PROUVÉ | `TrashSpotterOwnerLoop`, `/api/actions`, `/api/signalements/me` | La persistence sans média est prouvée par `E2E-2-SIGNALEMENT-PERSISTENCE`; la chaîne média reste non prouvée et empêche le statut global `END_TO_END_OK`. |
| Signalement — persistence sans média | `/signalement` | anonyme puis connecté | saisir publiquement, authentifier au submit, envoyer sans photo, relire | auth Clerk au submit certifié uniquement | ligne d’observation persistée avec propriétaire, géométrie, catégorie et état métier, puis relecture exacte | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `TrashSpotterOwnerLoop`, `/api/actions`, `/api/signalements/me` | Gate A consolidée : double clic synthétique → un seul POST `201`, ligne `trash_spotter_spots` relue, `/api/signalements/me` `200`, reload propriétaire. Preuve : `E2E-2-SIGNALEMENT-PERSISTENCE`, `artifacts/playwright/authenticated-campaign-2/evidence.json`. |
| Preuves photo d’une observation | `/signalement`, dashboard | connecté propriétaire | joindre, provoquer un échec contrôlé, retry, cliquer “voir les preuves”, recharger, finaliser à nouveau | auth + ownership au submit, au finalize et à la lecture | intent, signed upload, objet Storage privé, metadata `ready`, relecture propriétaire et idempotence | PAGE_OK | INTERACTION_OK | END_TO_END_OK | `/api/signalements/[id]/media/intents`, `/api/signalements/[id]/media/[mediaId]/finalize`, Storage `signalement-evidence` | Gate B consolidée : `intent 201 → upload HTTP 500 contrôlé → retry → finalize 200 → metadata ready → owner readback 200`; fichier JPEG réel `269365` octets, bucket/path vérifiés, second finalize idempotent ; anonyme `403` médias et `401` observations. Preuve : `E2E-2-SIGNALEMENT-MEDIA`, `artifacts/playwright/authenticated-campaign-2/evidence.json`. |
| Historique actions | `/actions/history` | connecté, propriétaire/organisateur/admin selon sous-action | filtres, sélectionner une ligne, charger plus, corriger, audit, export PDF | auth à l’accès car historique privé ; autorisation par action à chaque mutation | donnée relue, correction persistée et audit consultable | Présente | Contrats GET/PATCH/audit | NON PROUVÉ | `/api/actions`, `/api/actions/[id]`, audit, export | Mur probablement légitime pour données personnelles ; vérifier les scopes séparément. |
| Fiche mission/action | `/missions/[id]` | connecté autorisé | ouvrir fiche, consommer les actions/contextes associés | auth/ownership au chargement | bonne fiche et état métier affichés, navigation cohérente | Présente | Câblage source | NON PROUVÉ | page mission, action store | Le lien de partage communautaire vers `/missions/[id]` doit être vérifié : risque de route sémantiquement inadéquate. |
| Messagerie, lecture | `/sections/messagerie`, `/messagerie` | connecté | discussions/DM, recherche, pagination, sélection canal | auth avant chargement de données privées | messages/inbox réellement relus avec RLS/capability | Présente | Contrats GET | NON PROUVÉ | `/api/chat`, `/api/chat/inbox`, `/api/chat/search/users` | Mur blur légitime pour données privées ; ne pas confondre aperçu visuel et accès. |
| Envoi de message | `/sections/messagerie` | connecté, capability canal | choisir canal/type, mentionner, envoyer annonce/message | auth + capability au submit | message/poll inséré, notifications éventuelles, relecture confirmée | Présente | Contrat POST + câblage | NON PROUVÉ | `/api/chat`, `app_messages`, RLS | Prioritaire avec relecture depuis une autre session. |
| Pièce jointe messagerie | `/sections/messagerie` | connecté | sélectionner image/PDF/doc, compression, upload, envoyer | auth avant upload et submit | objet Storage accessible selon règle, URL rattachée au message | Présente | Câblage source | NON PROUVÉ | bucket `chat-attachments`, Storage, `/api/chat` | Vérifier taille 8 MB, type, visibilité et absence d’URL orpheline. |
| Sondage messagerie | `/sections/messagerie` | connecté | créer poll, voter, changer/retirer vote | auth + appartenance au canal au vote | vote upserté/retiré et compteurs relus côté serveur | Présente | Contrats POST/PUT/DELETE | NON PROUVÉ | `/api/chat/polls/[messageId]/vote` | Texte UI indiquant un vote “later batch” semble obsolète puisque l’API existe. |
| DM et lecture inbox | `/sections/messagerie` | connecté | chercher utilisateur, ouvrir DM, marquer lu, navigation notification | auth au clic/chargement privé | conversation ciblée, unread count et read state persistés | Présente | Contrats GET/PATCH | NON PROUVÉ | `/api/chat/users`, `/api/chat/inbox`, notifications | Tester redirection depuis notification et absence de fuite inter-utilisateurs. |
| Profil et compte | `/profil`, `/profil/[profile]`, `/dashboard` | connecté | onglets, badges, statistiques, handle, navigation | auth ; lecture publique éventuelle seulement pour profils explicitement publics | profil/handle affiché et mutations self-service persistées | Présente | Câblage source + API | NON PROUVÉ | `/api/users/profile/handle`, gamification, Clerk | Clarifier quelles fiches `/profil/[profile]` sont réellement publiques. |
| Préférence nom affiché | `/reglages` | connecté | choisir mode de nom | auth au changement | Clerk/Supabase/cookie cohérents après rechargement | Présente | Contrat PATCH + câblage | NON PROUVÉ | `/api/users/profile/display-name-mode` | Vérifier cohérence multi-session. |
| Localisation de compte | `/onboarding`, `/onboarding/localisation` | connecté | arrondissement/type de zone, soumettre, retour `next` | auth à l’accès et au submit ; validation serveur | préférence de localisation persistée, redirection sûre | Présente | Contrat profile-role + câblage | NON PROUVÉ | `/api/account/profile-role`, Clerk metadata, Supabase | Onboarding authentifié dès la page : légitime pour compte, mais ne doit pas être utilisé comme prérequis aux lectures publiques. |
| Dashboard et promotion | `/dashboard` | connecté ; promotion pour membre autorisé | actions rapides, ouvrir profil, demander rôle, formulaire feedback/promotion | auth à l’accès ; rôle/état côté serveur au submit | promotion persistée et email/inbox créateur | Présente | Contrat API + câblage | NON PROUVÉ | `/api/community/promotion-requests`, dashboard stores | Vérifier déduplication et autorisation serveur. |
| Notifications | navigation globale/dashboard | connecté | ouvrir cloche, marquer lu, suivre la cible | auth avant données et mutation read | notification relue, état lu persisté, redirection correcte | Présente | Câblage source | NON PROUVÉ | notifications client/Supabase, chat | Aucun E2E et dépendance temps réel/lecture lente à caractériser. |
| Gamification personnelle | `/gamification`, `/sections/gamification`, `/profil/impact` | connecté ; lecture pédagogique éventuellement anonyme | badges, leaderboard, points, referrals, quiz progress, impact | auth au chargement des données personnelles et aux mutations | points/badges/referral/progression relus depuis serveur | Présente | Contrats API + câblage | NON PROUVÉ | `/api/gamification/*`, Supabase/RLS | **Mur suspect modéré :** section gamification entière `disabled` alors qu’une partie pédagogique peut être publique ; séparer lecture publique et données personnelles. |
| Carte d’impact personnelle | `/profil/impact` | connecté | télécharger/partager la carte, ouvrir méthode/rapports | auth pour données personnelles ; export local ensuite sans nouvel appel | export/share correspond aux données effectivement chargées | Présente | Câblage source | NON PROUVÉ | gamification, Blob/Web Share/clipboard | Vérifier qu’aucune valeur placeholder n’est exportée. |
| Rapports, analyse | `/reports` | connecté | onglets, filtres/lecture KPI, ouvrir analyse | auth actuellement avant toute page ; données détaillées selon rôle | KPI chargés depuis sources et cohérents avec période | Présente | Câblage serveur | NON PROUVÉ | `loadReportsAnalysisData`, pilotage | **Mur suspect modéré :** page entière bloquée alors qu’un résumé public ou une page méthodologique pourrait rester lisible ; charge lourde seule ne justifie pas automatiquement le mur. |
| Génération de rapport | `/reports?tab=generation` | connecté admin-like | prévisualiser, générer, voir historique, réexporter | rôle admin-like au moment exact de génération/export | snapshot persisté, document disponible et historique relu | Présente | Contrats POST/GET | NON PROUVÉ | `/api/reports/generations`, Storage | Prioritaire pour persistence et relecture ; ne pas considérer le preview comme génération réussie. |
| Exports admin actions | `/admin`, `/reports` | admin-like | télécharger CSV/JSON, lancer dry-run/import, modérer une entité | auth + rôle admin-like à chaque appel | artefact généré/téléchargé, import et audit réellement appliqués | Présente | Contrats API + câblage | NON PROUVÉ | `/api/reports/actions.csv`, `.json`, `/api/actions/import`, moderation | Prioritaire ; vérifier artefact, compteurs, audit et absence de mutation lors du dry-run. |
| Rapport imprimable | `/prints/report` | connecté | afficher, imprimer, comparer les cartes | auth actuellement avant le rapport complet | données du rapport relues, impression/export conforme | Présente | Câblage source | NON PROUVÉ | pilotage, actions cache, `window.print`/print CSS | Mur probablement lié aux données détaillées ; impression réelle non vérifiée. |
| Pilotage | `/pilotage` | connecté coordinateur/admin-like | charger vue, périodes, filtres, naviguer vers reporting | auth + rôle au chargement et aux changements | overview calculé depuis les sources autorisées | Présente | Contrat GET | NON PROUVÉ | `/api/pilotage/overview`, source unifiée | Vérifier rôle coordinateur versus admin et bornes de période. |
| Onboarding partenaire | `/partners/onboarding` | connecté candidat partenaire | étapes, couverture géographique, disponibilités, submit | auth au submit et au chargement privé ; rôle métier contrôlé serveur | demande partenaire persistée + email creator | Présente | Contrat POST + câblage | NON PROUVÉ | `/api/partners/onboarding-requests`, Resend | Formulaire entièrement derrière auth : acceptable pour une demande de compte, à comparer à l’exigence métier. |
| Revue annuaire partenaire | `/partners/dashboard` | admin/creator autorisé | charger, accepter/refuser une entrée publiée | auth + rôle + décision auditée | statut publié réellement modifié puis visible dans l’annuaire public | Présente | Contrat POST | NON PROUVÉ | `/api/admin/partners/published-directory`, Storage/Supabase | Prioritaire avec relecture anonyme du résultat publié. |
| Sponsor portal | `/sponsor-portal` | sponsor/admin selon rôle | consulter/agir sur le portail et ses livrables | auth + scope sponsor | état sponsor, livrables ou redirection réellement disponibles | Présente | Câblage source | NON PROUVÉ | route sponsor, données protégées | Surface à détailler au premier passage rôle dédié. |
| Inbox créateur et feedback | `/admin`, `/admin/godmode` | admin/creator | filtrer, copier, répondre par email, traiter/archiver feedback et demandes | auth + rôle + audit | statut, note d’audit et email de réponse réellement traités | Présente | Contrats PATCH + câblage | NON PROUVÉ | `/api/admin/creator-inbox`, `/api/community/bug-reports`, clipboard/mailto | Copier ou toast ne prouve pas le traitement métier. |
| Gestion des rôles | `/admin`, `/admin/godmode` | admin autorisé | rechercher, attribuer elu/admin, révoquer | auth + rôle admin + cible protégée | rôle Clerk/Supabase cohérent et session suivante conforme | Présente | Contrat POST + câblage | NON PROUVÉ | `/api/admin/role-accounts`, Clerk/Supabase | Prioritaire sécurité ; tester auto-révocation et séparation des rôles. |
| Services, quotas et état système | `/admin/services` | admin | actualiser, capturer impact, gérer services gratuits, stockage, statut, ouvrir gouvernance | auth admin à chaque mutation/lecture | capture/paramètre persistant, métrique relue, rapport téléchargeable | Présente | Contrats API + câblage | NON PROUVÉ | `/api/admin/*`, `/api/reports/governance-monthly` | Famille à découper par endpoint lors de la campagne admin. |
| Banque de quiz et métriques | `/admin/quiz-bank` | admin | filtrer questions, ouvrir cible, lire métriques pédagogiques | auth admin | question/métrique source et état d’audit cohérents | Présente | Câblage source | NON PROUVÉ | quiz bank, BotID metrics | Peu de mutations UI retrouvées ; vérifier si les contrôles visibles sont réellement actifs. |
| Feature flags et godmode | `/admin/godmode` | admin | trafic, flags, clear analytics, ouvrir déclaration test | auth admin | configuration et analytics réellement modifiés, pas seulement local state | Présente | Câblage source | NON PROUVÉ | `enhanced-admin`, feature flags/analytics | **À vérifier :** plusieurs boutons ont un effet potentiellement local ou non persisté. |
| Email de test et envoi admin | `/admin/services`, surfaces admin | admin | tester email, envoyer message, consulter statut | auth admin + destinataire contrôlé | email effectivement accepté/remis par provider, identifiant conservé | Présente | Contrats API | NON PROUVÉ | `/api/email/test`, `/api/send`, Resend | Priorité haute mais nécessite secrets/boîte de test ; aucun envoi live dans cette passe. |
| Analytics de funnel | surfaces globales et dashboard | anonyme/connecté ; lecture admin | événements navigation/conversion envoyés automatiquement, filtres admin | émission anonyme autorisée ; attribution user optionnelle ; lecture admin | événement réellement stocké/agrégé et exploitable dans le reporting | Présente | Contrat POST/GET | NON PROUVÉ | `/api/analytics/funnel`, Supabase | Vérifier consentement, déduplication et absence de données sensibles. |

## Murs d’authentification suspects

Les éléments ci-dessous sont des hypothèses d’audit fondées sur le code actuel, à confirmer par parcours navigateur et par la sensibilité métier des données :

1. `/actions/new` : ancien `ClerkRequiredGate` avant le choix rapide/complète. **Corrigé dans cette campagne** : la page et le choix sont publics ; l’identité est reportée à l’envoi/reprise qui la nécessite.
2. `/signalement` : ancienne page entièrement blur-gated avant géolocalisation et saisie. **Corrigé dans cette campagne** : le formulaire et la préparation sont publics ; l’identité est reportée au submit certifié.
3. `/sections/annuaire` : ancien mode `disabled` alors que `/api/partners/published-directory` expose un répertoire accepté public-safe. **Corrigé dans cette campagne** : mode visible.
4. `/sections/trash-spotter` : mode `blur` alors que son flux de lecture repose sur la carte publique ; la création et les preuves privées, elles, justifient une authentification ciblée.
5. `/sections/community` : mode `disabled` et GET événements authentifié ; il faut décider si les événements sont réellement privés ou si seule la participation/création doit être protégée.
6. `/sections/gamification` : mode `disabled` pour une surface mélangeant contenus pédagogiques et données personnelles ; séparation lecture publique / compte à examiner.
7. `/reports` : blocage de toute la page avant analyse, alors qu’un résumé public limité pourrait éventuellement être séparé des exports détaillés admin.

Ne sont pas classés comme murs prématurés sans preuve supplémentaire : `/dashboard`, `/actions/history`, `/messagerie`, `/onboarding`, `/reglages`, `/pilotage`, `/prints/report` et les espaces admin, car ils portent explicitement des données personnelles, de rôle ou de supervision. Le contrôle doit néanmoins intervenir côté serveur, indépendamment de la visibilité UI.

## Résultats de la campagne E2E n°1

La campagne a utilisé le serveur local ponctuel `node scripts/dev/dev-with-fallback-port.mjs` et Playwright Chromium. Le bypass local a été désactivé pour le parcours anonyme ; le bypass `max` n’a servi qu’à vérifier la disponibilité d’un contexte connecté. Aucune vraie session Clerk de développement n’a pu être stabilisée : les clés locales provoquent une boucle de handshake/rafraîchissement (`Clerk: Refreshing the session token resulted in an infinite redirect loop`).

| preuve | constat vérifié | surfaces concernées |
|---|---|---|
| `HTTP-A1` | Les six routes de campagne répondent `200` sans redirection. `GET /api/actions/map?status=all&days=3650&limit=250` répond `200`, `count=10`; `GET /api/actions/group-join?limit=24` répond `200`, `authenticated=false`, `count=0`; `GET /api/partners/published-directory` répond `200`, `count=0`. | carte, annuaire/réseau, rejoindre, déclaration, signalement |
| `HTTP-A2` | Les mutations anonymes `POST /api/actions/group-join` et `POST /api/actions` répondent `401`; aucun effet métier n’est créé. | participation, déclaration/signalement |
| `HTTP-C1` | Avec le bypass local `max`, `GET /api/actions/group-join` répond `authenticated=true`; le même POST sur un identifiant de test inexistant passe la garde d’identité puis répond `422` de validation, sans mutation. | participation |
| `PW-C1` | Le test Playwright de `/signalement?lat=48.8566&lng=2.3522` passe pour la route, le groupe “État observé du lieu” et la présence de “Position Certifiée”. | signalement |
| `PW-C2` | Le choix “Déclarer avant l’action” est visible, mais la navigation client est réinitialisée par le handshake Clerk avant que “Préparer le formulaire de groupe” soit prouvable. Artefact : `artifacts/playwright/results/public-first-campaign-camp-e2d6e-hoice-before-authentication-chromium/trace.zip`. | déclaration |
| `PW-C3` | Le premier test atteint la carte publique, puis la navigation vers l’annuaire échoue avec `net::ERR_ABORTED`; l’artefact montre la réinitialisation client. | carte, annuaire |
| `UNIT-C1` | Les contrôles de proxy, flux déclaration, exports, signalement et API group-join passent : `6` fichiers, `27` tests. | garde-fous et contrats |

Ces preuves ne justifient aucun `END_TO_END_OK` : aucun fichier CSV/GeoJSON/PNG n’a été obtenu puis inspecté ; aucune participation n’a été jointe, rejouée idempotemment, quittée puis relue ; aucune observation n’a été persistée et relue.

## Campagne E2E n°1B — levée des bloqueurs et preuves réelles

Exécution du 29 août 2026 depuis le checkout local `main`, HEAD `8dcf5a0d`, sans reset, worktree ni écrasement des changements parallèles. Le serveur local a été lancé ponctuellement avec `DEV_HOST=127.0.0.1`, `DEV_STRICT_PORT=1` et `CMM_DISABLE_DEV_AUTH_BYPASS=1`. La campagne a finalement été rejouée avec un worker Playwright afin d’éviter les compilations Turbopack concurrentes ; aucun bypass n’est utilisé comme preuve d’authentification.

### Statuts et preuves

| statut | preuve vérifiée | portée |
|---|---|---|
| `FIXED` | La boucle `Refreshing the session token resulted in an infinite redirect loop` venait de `SitePreferencesProvider` : React Strict Mode rejouait le même effet de synchronisation de locale, et le garde provoquait un second `window.location.reload()`. Le garde mémorise maintenant la dernière locale appliquée ; le test unitaire de répétition idempotente passe et les navigations Playwright se stabilisent. | Clerk local / navigation des surfaces publiques |
| `FIXED` | La paire locale n’a pas révélé de mismatch de mode ou de domaine : les deux clés sont des clés de développement, leur domaine public décodé correspond au domaine Clerk utilisé par l’instance de développement, et aucune valeur secrète n’a été exposée. La cause racine observée était applicative, pas une clé affichée comme preuve d’authentification. | configuration Clerk locale |
| `FIXED` | `/api/signalements/me` était absent du matcher Clerk : son `GET` privé tombait dans `requireAuthenticatedAccess` sans contexte middleware et répondait `500`. Le préfixe `/api/signalements(.*)` a été ajouté au contexte Clerk ; les protections du handler restent inchangées. | signalement, lecture privée optionnelle |
| `INTERACTION_OK` | Les routes publiques `/actions/map`, `/sections/annuaire`, `/partners/network` et `/sections/rejoindre-un-formulaire` rendent leurs contrôles anonymement ; le choix public de `/actions/new` ouvre réellement le formulaire préparatoire ; `/signalement` accepte une position fournie, une catégorie et conserve un brouillon avant d’afficher « Se connecter et reprendre ». | `PW-1B-PUBLIC-ROUTES`, `PW-1B-ACTION-CHOICE`, `PW-1B-SIGNAL-PREP` |
| `END_TO_END_OK` | Depuis `/actions/map`, Playwright a déclenché les trois téléchargements. La réponse `/api/actions/map` contenait `10` items ; le CSV fait `9 644` octets et contient les `10` IDs dans le même ordre après parsing CSV quoté/multiligne ; le GeoJSON fait `14 437` octets, est une `FeatureCollection` de `10` features aux mêmes IDs ; le PNG fait `1 136 814` octets, possède la signature PNG et des dimensions IHDR `2411 × 1445`. | `E2E-1B-EXPORTS`, preuve conservée dans `artifacts/playwright/downloads/campaign-1b/evidence.json` |

### Problèmes rencontrés et solutions n°1B

| problème | cause identifiée | solution / résultat |
|---|---|---|
| La vérification initiale du CSV annonçait des IDs supplémentaires. | Le contrôle de campagne séparait les lignes et colonnes sans respecter les guillemets ; les champs `notes` et `geometry_geojson` contiennent des virgules et retours à la ligne légitimement quotés. | Ajout d’un parseur CSV de contrôle gérant guillemets, échappements et champs multilignes. Le fichier réel est maintenant validé avec `10/10` IDs correspondants. |
| La première exécution multi-surface échouait avec `ERR_ABORTED`, chunks Turbopack `404` et `socket hang up`. | La spécification enchaînait plusieurs navigations dans une même page pendant la compilation à chaud ; le harness lançait aussi plusieurs workers. | Parcours publics séparés par surface et exécution de campagne avec `--workers=1` et `DEV_HOST=127.0.0.1`. Les `7` tests de la campagne passent ; la contrainte de harness est documentée, sans modification de sécurité. |
| Le signalement chargeait une lecture privée au chargement public et produisait un `500` Clerk. | `/api/signalements/me` appelait `requireAuthenticatedAccess` sans matcher de contexte. | Ajout ciblé du matcher API ; la route demeure privée et le formulaire préparatoire reste public. |
| Le scénario Clerk connecté ne pouvait pas être repris jusqu’à une vraie mutation. | Aucun compte Clerk de développement/test autorisé n’était disponible dans l’environnement d’exécution ; utiliser un bypass aurait transformé le diagnostic en fausse preuve. | Aucun contournement. Les parcours anonymes et la frontière d’authentification sont testés ; la session réelle, sa reprise et les mutations restent bloquées par l’environnement d’identité. |
| Aucun bouton de participation ne pouvait être relié à une persistence réelle. | `GET /api/actions/group-join?limit=24&historyLimit=12` renvoie `count=0` ; aucune action joinable n’est disponible dans la source courante. | Aucune donnée distante ni fixture arbitraire injectée. Join, idempotence, leave et relecture sont classés `BLOCKED_DATA`. |
| L’annuaire publié ne permettait pas de vérifier une fiche réelle. | `/api/partners/published-directory` répond `count=0`, même si les contrôles et les entrées éditoriales statiques de la page sont accessibles. | Aucune publication fictive. Recherche sur entrée publiée, fiche et lien externe restent `BLOCKED_DATA`. |

### Limites non résolues

- `BLOCKED_ENV` : aucune session Clerk réelle et aucune identité de test disponible pour démontrer `anonyme → auth Clerk → reprise`, la persistance d’une déclaration ou d’un signalement et la relecture propriétaire. La boucle de rechargement locale est corrigée ; cela ne vaut pas preuve de connexion Clerk réussie.
- `BLOCKED_DATA` : aucune fixture joinable locale canonique et non destructive n’a pu être créée : Supabase local n’est pas disponible et l’application pointe vers une source distante. Aucun écrit n’a été envoyé à la production ; participation, idempotence, quitter et relecture restent non prouvés.
- `BLOCKED_DATA` : aucun partenaire publié réel n’est disponible pour les interactions de fiche et de redirection externe.
- Hors lot volontairement non exécuté : création complète, upload/finalize des médias, messagerie, communauté, rapports/admin, contact, newsletter et email.

## Campagne E2E n°1C — fiabilisation de l’environnement de test

Revalidation effectuée le 29 août 2026 depuis le même checkout `main` dirty,
sans reset, worktree, écriture Supabase distante ni bypass d’authentification.
Le runner Playwright est désormais déterministe pour ce lot : host de dev
explicitement `127.0.0.1`, port strict et un seul worker. La campagne publique
complète passe `7/7` avec `CMM_DISABLE_DEV_AUTH_BYPASS=1`.

### ROOT_CAUSE_CLERK

La boucle `Refreshing the session token resulted in an infinite redirect loop`
était causée par le rechargement de page de
`SitePreferencesProvider` : React Strict Mode rejouait le même effet de
synchronisation de locale, et le garde historique déclenchait un second
`window.location.reload()` pour la même locale. Le garde mémorisant
`lastLocale` est conservé et couvert par un test unitaire.

La configuration Clerk a été contrôlée sans afficher de secret :

- la clé publique locale est `pk_test_*` et son host décodé est
  `direct-leopard-28.clerk.accounts.dev` ;
- la clé secrète locale est `sk_test_*` et l’API Clerk répond avec
  `environment_type=development` et un identifiant d’instance présent ;
- l’environnement public servi par le host décodé répond `200` et expose
  `instance_environment_type=development` ; les environnements public et
  secret concordent ;
- `NEXT_PUBLIC_APP_URL` vaut `http://localhost:3000`, cette origine est
  autorisée côté instance Clerk ; aucun `CLERK_DOMAIN`, proxy, satellite ou
  allowed party n’est configuré, ce qui est cohérent pour un origin local
  direct ;
- aucun `dev-browser-missing` ni boucle de navigation n’est observé dans la
  campagne stricte après correction. L’avertissement restant est uniquement
  l’avertissement normal des clés Clerk de développement.

Cette vérification établit la cohérence de l’environnement et la cause
applicative de la boucle ; elle ne constitue pas une preuve qu’un utilisateur
Clerk réel a été authentifié.

### Fixture et blocage de données

`FIXTURE_STATUS=BLOCKED_DATA`. Le flux `group-join` consomme réellement
`public.actions` et `public.action_participants` via le client Supabase serveur;
`test_records.json` n’est donc pas une source de fixture pertinente. Le dépôt
contient les migrations canoniques de ces tables, mais pas de seed Supabase,
helper de fixture local ou instance locale active. Le poste ne dispose ni de la
commande `supabase`, ni de Docker, et `.env.local` pointe vers une instance
Supabase distante. Une fixture ne peut donc pas être créée, relue puis nettoyée
de façon contrôlée sans risquer une écriture distante ; aucune donnée n’a été
injectée.

L’audit de l’arbre de migrations a bien été exécuté (`123` fichiers canoniques,
aucun doublon), mais reste en échec sur une violation préexistante et hors lot
dans `20260827120000_close_performance_advisor_rls_initplan_and_duplicate_indexes.sql`
(policies `public.spots` après retrait de la table legacy). Cette anomalie n’a
pas été modifiée pour obtenir un vert artificiel.

### Statuts effectivement prouvés

| statut | preuve | portée |
|---|---|---|
| `FIXED` | `playwright.config.ts` impose le host local explicite, le port strict et un seul worker ; la campagne complète passe `7/7` sans les erreurs de compilation/navigation concurrentes précédentes. | fiabilité du harness local |
| `INTERACTION_OK` | Les surfaces carte, annuaire, réseau partenaire, rejoindre, choix `/actions/new` et préparation `/signalement` sont accessibles anonymement. La catégorie et la position sont saisissables avant submit ; le submit public affiche « Se connecter et reprendre » et le brouillon est conservé dans `sessionStorage`. | `E2E-1C-PUBLIC-7-OF-7` |
| `END_TO_END_OK` | CSV, GeoJSON et PNG sont téléchargés depuis `/actions/map`, puis inspectés. CSV : `9 644` octets, `10` lignes et IDs concordants. GeoJSON : `14 437` octets, `FeatureCollection`, `10` features, IDs concordants et géométries présentes. PNG : `1 136 814` octets, signature valide, dimensions `2411 × 1445`. | `E2E-1B-EXPORTS`, `artifacts/playwright/downloads/campaign-1b/evidence.json` |
| `BLOCKED_ENV` | Aucun identifiant/compte Clerk de test réel n’est disponible dans l’environnement. En contexte API vierge, `GET /api/signalements/me` reste suspendu jusqu’au timeout Playwright de `30 s` dans le middleware Clerk de développement au lieu de retourner immédiatement `401`. Le bypass local reste explicitement désactivé et n’est pas une preuve. | reprise authentifiée `/actions/new`, restauration authentifiée `/signalement`, lecture privée `/api/signalements/me` |
| `BLOCKED_DATA` | Aucun Supabase local contrôlé et aucune action joinable actuelle n’est disponible ; la fixture ne peut pas être créée sans écrire la source distante. | join, relecture, idempotence, quitter |

### Scénarios non fermés

- `rejoindre → relecture → seconde tentative idempotente → quitter → relecture` :
  non exécuté, car il manque à la fois une fixture locale et une session Clerk
  réelle ; aucun toast ou état React ne sera utilisé comme substitut.
- `/actions/new` : le choix public est prouvé ; le moment exact de l’auth et la
  reprise après Clerk réelle restent `BLOCKED_ENV`.
- `/signalement` : géolocalisation/saisie préparatoire et conservation du
  brouillon sont prouvées ; la restauration après authentification réelle reste
  `BLOCKED_ENV`. Aucun signalement complet avec médias n’a été persisté.
- La configuration de clé/instance est cohérente, mais le chemin Clerk protégé
  sans identité réelle reste bloqué par le handshake dev-browser côté middleware
  (`GET /api/signalements/me`, timeout `30 s`). Il n’a pas été contourné par un
  skip de middleware ou un faux 401.
- Annuaire/réseau partenaire : lecture de surface prouvée, mais aucune fiche
  publiée n’est disponible pour valider une interaction ou redirection réelle.

Les modifications de cette passe restent limitées au garde de locale déjà
corrigé, au matcher privé du signalement déjà ajouté en 1B et à la
fiabilisation du runner Playwright ; aucune protection AuthN/AuthZ, RLS ou
source distante n’a été affaiblie.

## Campagne E2E n°1D — harness authentifié et Supabase local

Exécution locale du 29 août 2026 depuis le checkout `main` dirty, avec
`CMM_DISABLE_DEV_AUTH_BYPASS=1`, serveur Next ponctuel, Docker Desktop,
Supabase CLI et `@clerk/testing`. Les exports carte ne sont pas rejoués : ils
restent couverts par `E2E-1B-EXPORTS` et leur preuve de fichier inspecté.

| statut | preuve | portée |
|---|---|---|
| `FIXED` | Docker Desktop a été remis en service après isolation de deux répertoires de sockets runtime obsolètes (`run.codex-stale-20260829` et `docker-secrets-engine.codex-stale-20260829`). La stack locale a démarré depuis `apps/web/supabase`, avec migrations canoniques appliquées et seed local exécuté. | environnement local Docker/Supabase |
| `FIXED` | `CookieConsentBanner` s’abonne désormais à `COOKIE_CONSENT_CHANGE_EVENT` ; le refus écrit dans le stockage et retire réellement le bandeau, qui ne bloque plus les clics Playwright. `ActionDeclarationEntryFlow` transmet désormais ses liens Clerk au formulaire « avant action ». | reprise publique `/actions/new` |
| `CLERK_E2E` | Le harness officiel utilise `clerkSetup`, `setupClerkTestingToken`, `clerk.signIn`, un utilisateur Development E2E marqué dans les métadonnées et un `storageState` généré localement. Aucun bypass AuthN/AuthZ n’est activé et les secrets restent dans l’environnement. | session Clerk réelle et reprise de parcours |
| `SUPABASE_LOCAL` | `supabase db reset --local --yes` exécuté depuis `apps/web/supabase` a appliqué les `124` migrations canoniques puis `seed.sql`; aucun `db push --linked` ni écrit distant n’a été exécuté. Le domaine Clerk déclaré dans `config.toml` est resté inchangé, car aucun effet sur les flux testés n’a été prouvé. | base locale et contrat Clerk/Supabase |
| `FIXTURE` | `seed.sql` crée ou remet à zéro l’action `6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71`, marquée `E2E_FIXTURE:group-join:v1`; le helper nettoie les participants après le scénario. | action joinable locale, idempotente et non destructive |
| `END_TO_END_OK` | `E2E-1D-GROUP-JOIN` : carte publique visible ; authentification au clic ; POST UI `200` et ligne `pending` relue ; seconde tentative réutilisant la même ligne ; DELETE persistant `cancelled` ; relecture `joined=false` et historique `cancelled` ; nettoyage exécuté. | participation |
| `END_TO_END_OK` | `E2E-1D-ACTION-NEW` : choix public et saisie préparatoire ; POST anonyme `/api/actions` `401` ; CTA avec retour `/actions/new` ; authentification Clerk officielle ; restauration des champs du brouillon. | entrée déclaration |
| `END_TO_END_OK` | `E2E-1D-SIGNALEMENT-DRAFT` : coordonnées et catégorie saisies publiquement ; submit sans identité refusé avec conservation du brouillon ; authentification Clerk officielle ; coordonnées et catégorie restaurées. Aucun signalement complet ni média n’est envoyé. | préparation et reprise du signalement |

La campagne Playwright complète passe `6/6` : setup Clerk, création de session,
participation, `/actions/new`, `/signalement` et teardown utilisateur. La preuve
JSON est conservée dans `artifacts/playwright/authenticated-campaign-1d/evidence.json`.
Les journaux contiennent encore des erreurs de lecture des notifications locales
non bloquantes (`NotificationBell`) et un avertissement Node de nettoyage Windows
lié au runner ; ils ne sont pas utilisés comme preuve métier.

## Campagne E2E n°2 — signalement complet et preuves photo

Les deux gates ont été exécutées avec le harness Clerk officiel et
`CMM_DISABLE_DEV_AUTH_BYPASS=1`, depuis Supabase local. La préparation anonyme,
l’authentification au moment du submit, la persistence sans média, le pipeline
Storage complet, la relecture propriétaire et le contrôle négatif anonyme sont
prouvés. Les exports des campagnes précédentes n’ont pas été rejoués.

| statut | preuve | portée |
|---|---|---|
| `END_TO_END_OK` | `E2E-2-SIGNALEMENT-PERSISTENCE` : session Clerk réelle ; préparation publique avec catégorie/coordonnées ; un double clic synthétique n’a produit qu’un `POST /api/actions` ; réponse `201` ; ligne relue dans `trash_spotter_spots` avec propriétaire Clerk, `spot_type=spot`, coordonnées `48.8566/2.3522`, état `new` et marqueur métier `cmm-waste:` ; `/api/signalements/me` répond `200` avec la même observation ; reload de `/signalement` retrouve le libellé. | Gate A sans média |
| `END_TO_END_OK` | `E2E-2-SIGNALEMENT-MEDIA` : session Clerk réelle ; intent `201`, premier upload signé échoué volontairement en `500`, retry réussi, finalize `200`, ligne `signalement_media` en `ready`, objet téléchargé depuis le bucket privé avec MIME `image/jpeg`, signature JPEG et taille concordante `269365` octets ; relecture propriétaire API/UI ; second finalize `alreadyReady=true`. | Gate B médias |
| `AUTHZ_NEGATIVE` | La même preuve vérifie depuis un contexte anonyme : lecture médias `403` et `/api/signalements/me` `401`. Aucun bypass AuthN/AuthZ n’est utilisé. | accès propriétaire/non-propriétaire des médias |
| `CLEANUP` | Teardown déterministe sur les deux identifiants exacts : suppression de l’objet Storage média, suppression du parent, puis relecture locale `parent=null` et `mediaReadbackCount=0`. Le marker `E2E_CAMPAIGN_2_PHOTO` est porté par la fixture média. | données locales créées par les Gates A/B |

## Campagne E2E n°3A — navigation publique, préférences et interactions locales

Exécution Playwright ciblée le 30 août 2026, sans Docker ni Supabase local et
sans rejouer les exports. Le serveur Next local n’a pas pu démarrer : le
checkout contient un `node_modules` partiellement verrouillé par Windows et
`npm ci` reste bloqué sur `EPERM/ENOTEMPTY`; aucun processus npm ciblant ce
checkout n’a été tué. Pour continuer la validation en lecture seule, le même
harness a été exécuté contre `https://cleanmymap.fr` avec
`PLAYWRIGHT_SKIP_WEBSERVER=1`. Cette origine distante ne constitue pas une
preuve que le déploiement correspond exactement au `main` local.

| statut | preuve | portée |
|---|---|---|
| `END_TO_END_OK` | `E2E-3A-NAVIGATION` : les routes publiques canoniques `/`, `/explorer`, `/actions/map`, `/methodologie`, `/sections/open-data`, `/sections/annuaire`, `/partners/network`, `/sections/rejoindre-un-formulaire`, `/actions/new` et `/signalement` ont atteint leur URL finale sans redirection Clerk ; le CTA carte → méthodologie et l’alias `/open-data → /sections/open-data` ont également atteint leur cible. | navigation publique |
| `END_TO_END_OK` | `E2E-3A-GLOBAL-SEARCH` : la requête publique `Méthodologie` a produit un résultat, sa sélection a atteint `/methodologie`. | recherche globale |
| `END_TO_END_OK` | `E2E-3A-COOKIE-CONSENT-ACCEPT` et `E2E-3A-COOKIE-CONSENT-REJECT` : acceptation et refus écrivent respectivement `cleanmymap_cookie_consent`, synchronisent `cleanmymap_analytics_consent=1/0`, masquent le bandeau et conservent cet état après reload. | consentement navigateur |
| `INTERACTION_OK` | `E2E-3A-MAP-INTERACTIONS` : recherche de zone, période, catégorie et reset ont produit les changements UI attendus ; le journal n’a pas fourni de donnée sélectionnable dans la réponse publique observée, donc popup/sélection restent non prouvés (`BLOCKED_DATA`). Les exports restent exclusivement couverts par `E2E-1B-EXPORTS`. | carte hors exports |
| `END_TO_END_OK` | `E2E-3A-OPEN-DATA-DOCS` : les ancres méthodologie et open data ont atteint les fragments finaux et les éléments ciblés étaient visibles ; aucun téléchargement documentaire n’est exposé par l’UI, donc aucun fichier n’a été inventé comme preuve. | documentation/open data |
| `BLOCKED_ENV` | `E2E-3A-PREFERENCES` : les contrôles langue/mode sont visibles et l’interaction est possible, mais l’origine distante revient à `fr` après sélection `en`; la persistence E2E de la locale n’est donc pas validée. Le thème possède un bouton `hidden` et n’est pas une préférence exposée. | préférences interface |
| `BLOCKED_ENV` | `E2E-3A-EXPLORER` : `/explorer` n’a pas rendu le heading `Sommaire` attendu ; la première exécution a montré l’écran runtime React `#441`. Aucun état vide ni sélection de résultat n’est transformé en succès. | Explorer |

La preuve JSON est conservée dans
`artifacts/playwright/public-campaign-3a/evidence.json`. La suite ciblée passe
`8/8` tests Playwright, mais ce vert technique inclut les deux statuts
explicitement bloqués ci-dessus ; il ne transforme pas ces blocages en
`END_TO_END_OK`.

## Lot ciblé 3A.1 — locale + Explorer

Exécution le 30 août 2026 sur le `main` courant, sans Docker ni Supabase local,
avec Next local et `CMM_DISABLE_DEV_AUTH_BYPASS=1`. Les exports, la recherche
globale, le consentement cookies et la navigation globale n’ont pas été
rejoués.

| statut | preuve | portée |
|---|---|---|
| `END_TO_END_OK` | `E2E-3A1-PREFERENCES-SELECT-RELOAD` : contexte navigateur vierge ; `fr` initial ; sélection `en` ; relecture réelle de `localStorage[cleanmymap.locale] = en`, du cookie `cleanmymap.locale=en` et de `document.documentElement.lang = en`, puis reload avec les trois valeurs toujours `en`. | locale publique |
| `END_TO_END_OK` | `E2E-3A1-PREFERENCES-LEGACY` : cookie serveur `fr` et préférence legacy `localStorage=en` ; la migration aboutit à `en`, écrit le cookie, puis aucune nouvelle navigation n’est observée après 1,5 seconde de stabilisation. Le test unitaire `resolveInitialLocale` couvre aussi le cookie serveur `en` initial et l’absence de boucle Strict Mode. | migration de préférence locale |
| `END_TO_END_OK` | `E2E-3A1-EXPLORER` : `GET /explorer` local `200`, heading `Sommaire`, cinq cartes et absence d’erreur page ; sélection d’un lien réellement rendu dans une carte puis URL finale `/actions/new`. | lecture et navigation Explorer |

## Campagne E2E n°3B — surfaces publiques/locales sans Docker

Exécution Playwright locale le 30 août 2026 avec `CMM_DISABLE_DEV_AUTH_BYPASS=1`,
sans Docker ni Supabase local. Le garde de campagne a classé toute requête
`POST`, `PUT`, `PATCH` ou `DELETE` same-origin vers `/api/` comme mutation
inattendue. Une réponse HTTP intermédiaire ou une mutation bloquée n’est pas
convertie en `END_TO_END_OK`.

| statut | preuve | portée |
|---|---|---|
| `END_TO_END_OK` | `E2E-3B-WEATHER` : `/sections/weather` répond `200`, la recherche publique sélectionne la suggestion locale Lyon, la prévision réelle Open-Meteo est affichée, le second jour devient actif et la géolocalisation refusée suit le fallback ; aucun POST métier n’est observé. Le reset n’est pas exposé par l’UI (`NOT_EXPOSED`). | météo publique |
| `BLOCKED_AUTH` | `E2E-3B-ROUTE` : les contraintes publiques restent saisissables ; après stabilisation, aucune recommandation protégée n’est appelée automatiquement. La frontière d’identité est le lien explicite `/sign-in?redirect_url=%2Fsections%2Froute`, atteint par navigation contrôlée ; aucune recommandation ou journal distant n’est créé. | itinéraire public jusqu’à l’identité |
| `END_TO_END_OK` | `E2E-3B-RECYCLING` : la question `Que faire d'une bouteille en plastique ?` produit la réponse locale visible malgré l’accès privé possible du breakdown ; aucun effet métier distant n’est observé. | assistant recyclage public |
| `END_TO_END_OK` | `E2E-3B-GUIDE-CHECKLIST` : `/sections/guide` atteint son alias réel `/sections/weather`, puis l’onglet `Composter` de `/learn/bonnes-pratiques` produit `?theme=compost`, URL conservée après reload. La checklist compte n’est pas exposée sur la page canonique et n’est pas déclarée validée. | guide et thèmes de lecture |
| `END_TO_END_OK` | `E2E-3B-QUIZ` : la démo publique de `/learn/sentrainer?mode=demo` parcourt ses cinq questions, atteint le `Bilan de session` avec score, puis relance une nouvelle session ; `cleanmymap.learn.progress` reste local et aucune requête métier non sûre n’est observée. | quiz public local |

### Corrections ciblées 3B

- Météo : ajout de timeouts d’abandon sur les lectures externes, conservation
  des suggestions locales lorsque le géocodeur distant échoue, et suppression
  de l’affichage de suggestions obsolètes entre deux recherches.
- Recyclage : le panneau d’assistant public n’est plus masqué par le chargement
  ou l’erreur du breakdown personnel protégé.
- Quiz : les questions vrai/faux exposent leur vérification ; le dernier bouton
  de session ouvre réellement le bilan au lieu de réinitialiser directement la
  session ; le test rejoue ensuite une session démo publique.
- Itinéraire : le `POST /api/route/recommend` ne part plus à l’entrée ni à la
  simple modification des contraintes anonymes ; l’accès protégé est matérialisé
  par une action de connexion explicite.

`artifacts/playwright/public-campaign-3b/evidence.json` contient les cinq
preuves structurées de l’exécution finale. Le garde n’a détecté aucune mutation
sur météo, recyclage, guide ou quiz ; l’itinéraire ne produit plus de mutation
anonyme avant la frontière d’identité.

### Corrections ciblées 3A.1

- `RootLayout` transmet `getServerLocale()` au `SitePreferencesProvider`.
- Le provider attend la lecture de la préférence locale legacy avant sa première
  écriture, ce qui évite la réécriture transitoire `fr` et les reloads Strict Mode.
- Explorer utilise `getSafeAuthSession()` pour rester lisible anonymement ; la
  résolution détaillée du rôle n’est appelée que pour une session authentifiée.
  Les contrôles AuthN/AuthZ et les mutations ne sont pas modifiés.

Le diagnostic initial `/explorer` avait reproduit l’erreur serveur non minifiée
`Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()` dans
`getCurrentUserRoleLabel()`. Après correction, la page locale rend sans erreur.

### Problèmes rencontrés et solutions n°2

| problème | cause identifiée | solution appliquée | résultat |
|---|---|---|---|
| Le premier submit signalement répondait `422` malgré une saisie UI complète. | Le payload de `buildQuickSignalementPayload` omettait `associationName`, champ requis par le contrat `/api/actions`. | Ajout ciblé de `associationName: "Action spontanée"` et assertion unitaire associée. | Gate A passe et la ligne est persistée/retrouvée. |
| Le contrôle de double-submit Playwright produisait parfois plusieurs POST ou expirait sur un bouton instable. | Deux `locator.click()` concurrents entraient en concurrence avec le rendu React et la libération du verrou après une erreur rapide. | Attente de l’état enabled puis deux `button.click()` DOM dans la même tâche ; le verrou applicatif reste inchangé. | Un seul POST observé dans `E2E-2-SIGNALEMENT-PERSISTENCE`. |
| La Gate B restait anonyme et ne pouvait donc pas atteindre la mutation. | Le test ne rétablissait pas la session Clerk sur sa page initiale. | Appel explicite à `clerk.signIn` avant navigation vers `/signalement`, sans bypass. | La session Clerk réelle atteint la création et l’upload ; Gate B est validée. |
| L’abandon réseau brut laissait l’état « préparation des photos » en attente. | `route.abort("failed")` provoquait une attente/retry du client Storage. | Réponse HTTP `500` contrôlée au premier upload, puis poursuite normale au retry. | Le cas d’échec et son retry sont déterministes ; la chaîne média finale est prouvée. |
| Le succès après retry n’était pas observé dans le délai par défaut. | Compression/finalisation locale dépassait parfois cinq secondes. | Attentes ciblées portées à `30 s`, sans modifier les délais métier. | Le retry et le finalize sont observés dans la Gate B validée. |
| Le serveur Next ne démarrait plus après des installations npm concurrentes. | Des processus `npm ci/install` parallèles ont supprimé ou laissé partiellement extraits `next`, `playwright` et `@tailwindcss/postcss`. | Aucun kill ni contournement ; les installations ont été laissées se terminer, puis une reconstruction canonique depuis le lockfile a été menée à terme et le cache `.next` généré a été nettoyé par le script canonique. | Next/Playwright ont redémarré ; Gate A+B passe `5/5`. |
| Docker Desktop refusait de démarrer avant la campagne finale. | Les tentatives précédentes avaient laissé des reparse points AF_UNIX runtime dans `Docker\\run` et `docker-secrets-engine`; les logs confirmaient successivement Ingest, Inference, OTel puis Secrets. | Déplacement réversible des seuls répertoires runtime hors du chemin actif, recréation des dossiers vides et redémarrage Docker ; aucune image, donnée, volume, cache ou VHDX n’a été supprimé. | Docker `29.7.2` et Supabase local ont redémarré ; la campagne A+B a passé `5/5`. |
| Le premier finalize média rejetait le chemin de preuve. | Le code générait un UUID de chemin distinct de l’`id` généré par PostgreSQL ; le contrôle serveur recalculait donc correctement un autre chemin. | Persistance de l’UUID généré dans la colonne `id`, avec test unitaire vérifiant `storage_path = signalement_id/id.extension`. | Gate B passe avec objet Storage téléchargé et metadata `ready`. |
| Le clic propriétaire après reload était intercepté par le bandeau cookies. | Le contexte Playwright n’avait pas encore persisté de choix de consentement. | Fermeture UI explicite par “Tout refuser” avant le clic métier, sans manipulation directe de l’ACL. | Relecture photo UI réussie. |
| Le contrôle négatif exécutait `fetch` depuis `about:blank`. | Le nouveau contexte anonyme n’avait pas d’origine pour résoudre l’URL relative. | Navigation vers `/` avant les appels `fetch`, sans session. | Médias `403`, observations `401`. |

## Historique — problèmes rencontrés pendant la campagne E2E n°1

Le tableau ci-dessous distingue les erreurs effectivement rencontrées, leur cause vérifiée, la solution appliquée dans le périmètre de la campagne et le résultat obtenu. Une correction de garde d’accès ou un test HTTP réussi ne constitue pas une preuve de l’effet métier final.

| problème rencontré | cause vérifiée | solution appliquée | résultat vérifié |
|---|---|---|---|
| Le lancement initial via `npm run dev:strict` ne démarrait pas correctement sous Windows. | Le script `dev:strict` utilise une affectation de variable d’environnement POSIX (`DEV_STRICT_PORT=1 ...`), qui n’est pas interprétée comme prévu par PowerShell/Windows. | `playwright.config.ts` appelle directement `node scripts/dev/dev-with-fallback-port.mjs` et transmet `DEV_STRICT_PORT=1` via `webServer.env`. | Le harness Playwright est listable et la campagne peut démarrer avec `npm run test:e2e:list`. |
| `/actions/new`, `/signalement`, `/sections/annuaire` et `/partners/network` étaient bloqués ou redirigés avant l’exploration publique attendue. | Les pages utilisaient un `ClerkRequiredGate`, un mode d’accès `disabled` ou une redirection vers une autre surface avant l’interaction nécessitant une identité. | Suppression des gates précoces dans les deux flux de déclaration, annuaire rendu visible, et page réseau partenaire rendue publique. Les actions de mutation restent protégées côté serveur. | Les six routes ciblées répondent `200` sans redirection (`HTTP-A1`) ; les POST anonymes de mutation restent refusés (`HTTP-A2`). |
| Les pages publiques appelant `auth()` provoquaient l’erreur Clerk de contexte middleware absent lorsque le service local était indisponible. | Les routes de campagne n’étaient pas toutes couvertes par le matcher de contexte Clerk et le fallback local ne distinguait pas assez les lectures publiques des mutations. | Ajout des routes ciblées aux préfixes de contexte et au matcher littéral de `proxy.ts`, avec fallback limité aux requêtes `GET` publiques des APIs de lecture. | Les lectures API carte, participation et annuaire répondent sans authentification lorsque les données sont disponibles ; aucune autorisation de mutation n’a été relâchée. |
| Le handshake Clerk du navigateur a provoqué des rechargements et destructions de contextes Playwright. | En anonyme, le navigateur boucle sur `__clerk_hs_reason=dev-browser-missing`. En bypass connecté, le serveur signale une boucle de rafraîchissement liée à une incompatibilité des clés/instance Clerk locales. | Aucun contournement de sécurité n’a été ajouté et aucun secret n’a été modifié. Le code a seulement été rendu public jusqu’au point d’action ; la configuration Clerk locale doit être stabilisée séparément. | Le parcours signalement atteint ses contrôles (`PW-C1`), mais deux tests Playwright échouent sur la navigation réinitialisée (`PW-C2`, `PW-C3`). |
| Le choix de déclaration était visible mais la reprise stable vers le formulaire de groupe n’était pas prouvable. | La navigation client était interrompue par le handshake Clerk avant que l’état suivant puisse être observé de façon fiable. | Le flux conserve le choix public et transmet les liens d’authentification au moment de l’action ; aucune mutation n’est appelée anonymement. | `PAGE_OK` est établi par HTTP et le choix initial est observé ; `INTERACTION_OK` et la reprise authentifiée restent non prouvés. |
| La saisie préparatoire du signalement ne pouvait pas être distinguée d’un blocage d’authentification de page. | Le formulaire complet appliquait un overlay/fieldset bloquant avant l’envoi, alors que la doctrine autorise la préparation publique. | Retrait du blocage transparent, ajout de CTA d’authentification au moment de l’envoi et sauvegarde locale du brouillon dans `sessionStorage`, restaurable après authentification puis supprimée après création réussie. | Les groupes et la position sont visibles dans Playwright ; aucune création puis relecture persistée n’a pu être menée à cause de la boucle Clerk. |
| Aucun parcours de participation réel n’était disponible pour tester rejoindre, idempotence, quitter et relecture. | `GET /api/actions/group-join?limit=24` renvoie `count=0`, en anonyme comme avec le bypass connecté. | Aucun faux jeu de données ni identifiant arbitraire n’a été injecté. Un POST avec identifiant non UUID a été laissé atteindre la validation afin de vérifier le garde d’identité (`HTTP-C1`). | La protection et la validation sont observées, mais la persistence de participation n’est pas vérifiable sans fixture réelle et session stable. |
| L’annuaire partenaire ne contenait aucune entrée publiée. | `GET /api/partners/published-directory` renvoie `count=0`. | Aucun partenaire fictif n’a été publié pour fabriquer une preuve. | La surface vide est accessible ; recherche, ouverture d’une fiche et redirection externe restent non testées. |
| Les exports carte n’ont pas produit de fichiers inspectables pendant la campagne. | Le contexte navigateur a été réinitialisé avant l’interaction stable avec les contrôles de filtre/export. Les tests unitaires des utilitaires et du bouton ne remplacent pas un fichier obtenu depuis l’UI. | Conservation du contrat d’export existant et validation ciblée des tests unitaires ; pas de déclaration de succès E2E sans fichier et contenu vérifiés. | CSV, GeoJSON et PNG restent `END_TO_END` non prouvés. |

## Historique — problèmes non résolus dans la campagne E2E n°1

Les points suivants ne pouvaient pas être résolus de manière fiable dans le périmètre autorisé, sans contourner l’authentification, inventer des données métier ou élargir la campagne :

1. **Stabilisation de Clerk en navigateur local.** Il faut une instance/paire de clés Clerk cohérente et un état de dev-browser stable. Tant que le handshake ou le refresh boucle, la reprise après authentification et les mutations connectées ne peuvent pas être prouvées.
2. **Preuve complète de participation.** Aucun élément rejoignable n’est présent dans la réponse locale. Il manque une fixture de campagne contrôlée et non destructive, puis une session connectée stable pour vérifier `join → join` idempotent → `leave → relecture`.
3. **Preuve de création et relecture du signalement.** La préparation publique est partiellement vérifiée, mais le submit authentifié, la persistence et la relecture n’ont pas pu être exécutés.
4. **Preuve des trois exports.** Aucun fichier CSV, GeoJSON ou PNG n’a été récupéré et inspecté ; les statuts restent donc inférieurs à `END_TO_END_OK` malgré les tests unitaires verts.
5. **Interactions de données de l’annuaire et du réseau partenaire.** La base locale étant vide, les filtres, la fiche, les liens externes et l’état d’un répertoire publié n’ont pas de support de test réel.
6. **Stabilité des navigations Playwright sur les surfaces publiques.** `net::ERR_ABORTED` et les destructions de contexte sont documentés par les traces, mais leur correction nécessite de traiter la configuration/session Clerk locale avant de conclure à un défaut applicatif.

Ne sont pas des problèmes « résolus » par cette campagne : les toasts, changements d’état React, réponses HTTP seules et tests unitaires. Ils restent des preuves de contrat ou de progression, jamais des preuves de persistence, d’email, de redirection externe, d’audit ou d’état métier final.

## Bilan de cette passe

- **Surfaces recensées : 61** lignes fonctionnelles dans la matrice. Les lignes regroupent uniquement des interactions partageant la même frontière métier ; les sous-actions sont listées explicitement dans la colonne `interaction`.
- **Répartition par famille :** navigation/identité/préférences `5` ; lecture publique, cartes et apprentissage `13` ; formulaires publics `4` ; actions et participations `12` ; messagerie `5` ; profil, compte et gamification `7` ; rapports/pilotage `5` ; partenaires/admin `9` ; analytics transverse `1`.
- **Murs suspects initiaux : 7** familles, dont `actions/new`, `signalement` et annuaire corrigés dans cette campagne ; `trash-spotter`, `community`, `gamification` et `reports` restent hors périmètre ou à arbitrer.
- **Niveau réellement démontré après n°1C :** les routes ciblées sont `PAGE_OK`, le choix public de déclaration et la préparation publique du signalement sont `INTERACTION_OK`, et les trois exports carte sont `END_TO_END_OK` avec fichier et contenu inspectés. Aucune mutation métier connectée, persistence, reprise Clerk ou relecture inter-session n’est encore prouvée.

## Lots E2E suivants recommandés

Après résolution de la configuration Clerk locale et ajout de fixtures réelles, conserver la séparation anonyme/connecté/rôle et la relecture de l’effet réel :

1. Carte publique et annuaire : lecture anonyme, filtres, export, puis relecture de l’annuaire après publication admin.
2. Rejoindre une action : liste anonyme, auth au clic, join/leave, relecture de l’état et revue organisateur.
3. Déclaration complète et ses médias : préparation publique si autorisée, submit authentifié, création, upload/finalize, relecture propriétaire et contrôle inter-session.
4. Contact, newsletter et signalement illicite : persistance réelle, idempotence, états d’échec email et absence de faux succès.
5. Messagerie : canal/DM, message, pièce jointe, poll vote, read state et contrôle RLS entre deux utilisateurs.
6. Communauté : lecture, RSVP, création, partage et relecture depuis la liste publique/compte.
7. Rapports/admin : génération, historique, CSV/JSON, dry-run/import/modération, artefact Storage et audit.
8. Onboarding, rôle, préférences et notifications : persistance multi-rechargement/session et redirection `next`.

## Zones du dépôt à tester ensuite

- Routes et accès : `apps/web/src/proxy.ts`, `apps/web/src/lib/auth/protected-routes.ts`, `apps/web/src/lib/clerk-access.ts`, `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`.
- Actions et médias : `apps/web/src/components/actions/`, `apps/web/src/app/api/actions/`, `apps/web/src/app/api/signalements/`.
- Carte et annuaire : `apps/web/src/app/(app)/actions/map/`, `apps/web/src/components/actions/map/`, `apps/web/src/components/sections/rubriques/annuaire/`, `apps/web/src/app/api/partners/published-directory/`.
- Communauté et feedback : `apps/web/src/components/sections/rubriques/community/`, `apps/web/src/app/api/community/`.
- Messagerie : `apps/web/src/components/chat/`, `apps/web/src/app/api/chat/`, Storage `chat-attachments`.
- Rapports/admin : `apps/web/src/components/reports/`, `apps/web/src/components/admin/`, `apps/web/src/app/api/reports/`, `apps/web/src/app/api/admin/`.
- Compte et préférences : `apps/web/src/components/account/`, `apps/web/src/app/api/account/`, `apps/web/src/app/api/users/`, `apps/web/src/app/onboarding/`.
- Harness actuel : `playwright.config.ts`, `e2e/smoke-public.spec.ts`, `e2e/security-boundaries.spec.ts`.

## Preuves de couverture disponibles

- `npm run audit:pages-site-drift` exécuté avec succès le 29 août 2026 : `56` routes `page.tsx`, `17` routes de sections, `73` routes dans l’index, `58` fiches canoniques ; aucune dérive détectée.
- `npm run test:e2e:list` exécuté avec succès : `14` tests Playwright dans `3` fichiers, dont `7` tests ciblés de la campagne n°1B.
- La campagne n°1 historique avait exécuté `3` tests, dont `2` échecs liés à la boucle Clerk/navigation (`PW-C2`, `PW-C3`). La campagne n°1B a ensuite exécuté `7/7` tests Playwright avec le bypass désactivé : routes publiques, choix déclaration, préparation signalement et exports inspectés (`E2E-1B-EXPORTS`). Aucun E2E de mutation, upload, email, persistence métier, rôle ou relecture inter-session n’est validé.
- Le checkout `main` était déjà fortement dirty ; aucun changement préexistant n’a été nettoyé, déplacé, stashé ou modifié.
