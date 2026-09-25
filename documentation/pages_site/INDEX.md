# Index maître des pages

Registre fonctionnel route-first de `documentation/pages_site`.

L'exhaustivité doit être contrôlée par :

```bash
npm run audit:pages-site-drift
```

Le mode strict est disponible avec :

```bash
npm run check:pages-site-drift
```

## Règles

- une route canonique = une fiche canonique ;
- une redirection ou un alias reste inventorié sans devenir une page autonome artificielle ;
- une route dynamique est documentée par son pattern ;
- les snapshots vivent dans le dossier `screenshots/desktop/` ou
  `screenshots/mobile/` de la page canonique concernée ;
- l'accès documenté doit correspondre au runtime réel ;
- la famille visuelle doit correspondre à `resolvePageFamily` ;
- une page ne peut pas être déclarée terminée si son contrat fonctionnel documenté est faux.

`INDEX.md` est l'inventaire maître : le contrôle de dérive vérifie la cohérence
structurelle entre les routes runtime, l'index et les fiches. Il ne valide pas à
lui seul la conformité sémantique du contenu des fiches.

## Taxonomie d'accès

| Valeur | Sens |
|---|---|
| `public-visible` | page ou section lisible sans compte |
| `auth-blur-gate` | aperçu ou gate flouté avant connexion |
| `auth-disabled-gate` | contenu verrouillé tant que le compte n'est pas connecté |
| `clerk-context` | contexte Clerk disponible sans hard gate de page ; les capacités sensibles gardent leur propre contrôle |
| `protected` | authentification imposée par le proxy ou la page |
| `admin-only` | rôle `admin` requis |
| `admin-like` | capability d'administration effective des profils `admin` ou `max` ; ne vaut pas pour `elu` par analogie |
| `max-only` | profil `max` requis |
| `auth-entry` | page de connexion, inscription ou onboarding |
| `legal-public` | page légale publique |
| `standalone` | outil ou page autonome |
| `dynamic` | route paramétrée |
| `redirect` | redirection ou alias technique |

## Contrat ACCESS / SEARCH / DISCOVERY / CANONICAL

La taxonomie d'accès ci-dessus décrit le rendu et le contrôle d'accès runtime.
Elle ne décide pas à elle seule de l'indexabilité. Le contrat SEO durable
distingue donc quatre axes indépendants :

| Axe | Valeurs | Question traitée |
| --- |---|---|
| ACCESS | `PUBLIC`, `HYBRID`, `PRIVATE` | Qui peut lire la surface et quelles capacités restent protégées ? |
| SEARCH | `INDEX`, `NOINDEX` | La page peut-elle être proposée dans les résultats de recherche ? |
| DISCOVERY | `SITEMAP`, `INTERNAL_ONLY`, `REDIRECT` | Comment la route doit-elle être découverte ? |
| CANONICAL | `SELF`, `TARGET`, `NONE` | Quelle URL porte le signal canonique ? |

`PUBLIC` signifie qu'aucune session n'est nécessaire pour lire la surface.
`HYBRID` signifie qu'une lecture ou une préparation publique coexiste avec des
mutations, des exports, des données personnelles ou des capacités soumises à
AuthN/AuthZ. `PRIVATE` désigne une surface personnelle, métier, partenaire,
administrative ou autrement protégée. Ces valeurs ne remplacent pas les
contrôles runtime : elles les décrivent avec le contrat de recherche.

Les lignes ci-dessous décrivent le contrat actuellement livré. Le code du
sitemap, des métadonnées et des redirects est aligné sur cette matrice ; les
tests runtime restent la preuve opérationnelle de cet alignement.

### Pages publiques et hybrides indexables

| Route | ACCESS | SEARCH | DISCOVERY | CANONICAL |
| --- |---|---|---|---|
| / | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /actions/map | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /actions/new | `HYBRID` | `INDEX` | `SITEMAP` | `SELF` |
| /signalement | `HYBRID` | `INDEX` | `SITEMAP` | `SELF` |
| /reports | `HYBRID` | `INDEX` | `SITEMAP` | `SELF` |
| /methodologie | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /explorer | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /learn/bonnes-pratiques | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /learn/comprendre | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /learn/ecole | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /learn/sentrainer | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/actors | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/annuaire | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/climate | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/compost | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/community | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/funding | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/open-data | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/recycling | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /sections/rejoindre-une-action | `HYBRID` | `INDEX` | `SITEMAP` | `SELF` |
| /conditions-generales-utilisation | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /mentions-legales | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /politique-confidentialite | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /politique-cookies | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /contact | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |
| /signaler-contenu-illicite | `PUBLIC` | `INDEX` | `SITEMAP` | `SELF` |

Les capacités d'envoi, de modification, d'export et de consultation des
données personnelles restent protégées sur les pages `HYBRID`. Une page
hybride indexable ne rend donc pas ses données privées anonymement accessibles.

### Pages accessibles sans session mais volontairement non indexées

| Route ou motif | ACCESS | SEARCH | DISCOVERY | CANONICAL |
| --- |---|---|---|---|
| /sections/feedback | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /sign-in | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /sign-up | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /error/429 | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /preview/actions/new | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /docs/* | `PUBLIC` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |

Ces routes peuvent être atteintes par un lien direct ou un workflow interne,
mais ne constituent pas des pages de recherche autonomes.

### Surfaces privées

| Route ou motif | ACCESS | SEARCH | DISCOVERY | CANONICAL |
| --- |---|---|---|---|
| /dashboard | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /compte/evolution | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /parcours et /parcours/* | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /profil et /profil/* | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /actions/history | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /missions/* | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /onboarding | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /reglages | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /admin et /admin/* | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /pilotage | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /sponsor-portal | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /partners/dashboard et /partners/onboarding | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /prints/report | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /sections/elus | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /sections/gamification | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |
| /sections/messagerie | `PRIVATE` | `NOINDEX` | `INTERNAL_ONLY` | `NONE` |

### Cas provisoire : Trash Spotter

`/sections/trash-spotter` reste provisoirement `HYBRID`, `NOINDEX`,
`INTERNAL_ONLY`, `NONE`. L'aperçu et l'exposition actuelle ne sont pas modifiés
par ce lot. La dette explicite est
`PUBLICATION_RIGHTS_DECISION_REQUIRED` : une décision produit doit confirmer
les droits de publication avant toute ouverture SEO ou modification de données.

### Redirects et alias

Les routes suivantes sont des compatibilités techniques, pas des pages SEO
autonomes. Leur canonical est la cible réelle et leur découverte relève de la
redirection :

| Route | Cible | ACCESS | SEARCH | DISCOVERY | CANONICAL |
| --- |---|---|---|---|---|
| /en | `/` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /conditions-utilisation | `/conditions-generales-utilisation` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /declaration | `/actions/new` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /community | `/sections/community` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /open-data | `/sections/open-data` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /messagerie | `/sections/messagerie` | `PRIVATE` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /gamification | `/sections/gamification` | `PRIVATE` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /sections/dm | `/sections/messagerie?tab=dm` | `PRIVATE` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /sections/guide | `/actions/new?panel=meteo` | `HYBRID` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /sections/route | `/actions/new?panel=itineraire` | `HYBRID` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /sections/weather | `/actions/new?panel=meteo` | `HYBRID` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /sections/rejoindre-un-formulaire | `/sections/rejoindre-une-action` | `HYBRID` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /partners/network | `/sections/community?tab=partners` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /partners/network/pepite | `/sections/community?tab=partners` | `PUBLIC` | `NOINDEX` | `REDIRECT` | `TARGET` |
| /onboarding/localisation | `/onboarding` | `PRIVATE` | `NOINDEX` | `REDIRECT` | `TARGET` |

`/en` n'est pas une version anglaise : aucune page anglaise autonome n'existe
actuellement et cette route ne doit pas être annoncée comme une version
`hreflang` `en-US`.

Il n'existe actuellement aucune page canonique `/learn`. Les pages
`/learn/*` portent chacune leur canonical propre.

## Homepage

| Route | Fiche | Accès | Famille | Source |
|---|---|---|---|---|
| `/` | [Homepage](./routes/00-homepage/homepage/homepage-README.md) | `public-visible` | Homepage | `apps/web/src/app/page.tsx` |

## Accueil & Pilotage

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/dashboard` | [Dashboard](./routes/01-accueil-pilotage/dashboard/dashboard-README.md) | `protected` | amber / pilotage | `apps/web/src/app/(app)/dashboard/page.tsx` |
| `/compte/evolution` | [Évolution du compte](./routes/01-accueil-pilotage/compte-evolution/compte-evolution-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/compte/evolution/page.tsx` |
| `/explorer` | [Sommaire](./routes/01-accueil-pilotage/explorer/explorer-README.md) | `public-visible` | yellow, exception nommée | `apps/web/src/app/(app)/explorer/page.tsx` |
| `/parcours` | [Parcours](./routes/01-accueil-pilotage/parcours/parcours-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/parcours/page.tsx` |
| `/parcours/[profile]` | [Parcours par profil](./routes/01-accueil-pilotage/parcours-profile/parcours-profile-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/parcours/[profile]/page.tsx` |
| `/pilotage` | [Pilotage](./routes/01-accueil-pilotage/pilotage/pilotage-README.md) | `auth-disabled-gate` ; `clerk-context` ; accès métier `coordinateur`/`admin`/`max` | pilotage | `apps/web/src/app/(app)/pilotage/page.tsx` |
| `/profil` | [Profil](./routes/01-accueil-pilotage/profil/profil-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/page.tsx` |
| `/profil/[profile]` | [Profil détaillé](./routes/01-accueil-pilotage/profil-profile/profil-profile-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/[profile]/page.tsx` |
| `/profil/impact` | [Profil impact](./routes/01-accueil-pilotage/profil-impact/profil-impact-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/impact/page.tsx` |
| `/sponsor-portal` | [Portail décideur](./routes/01-accueil-pilotage/sponsor-portal/sponsor-portal-README.md) | `protected` | pilotage | `apps/web/src/app/(app)/sponsor-portal/page.tsx` |
| `/sections/elus` | [Gouvernance](./routes/01-accueil-pilotage/gouvernance/gouvernance-README.md) | `auth-disabled-gate` | accueil-pilotage | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |

## Agir

### Entrées visibles du bloc

Le bloc Agir expose exactement les trois entrées utilisateur suivantes, dans
cet ordre :

1. [Rejoindre une action](/sections/rejoindre-une-action)
2. [Créer une action](/actions/new)
3. [Signaler un déchet](/signalement)

Un sondage ou une action de terrain sert d'aide à l'arbitrage ; son résultat ne
constitue pas une décision officielle.

Le tableau ci-dessous inventorie aussi les routes de workflow et de compatibilité
pour conserver les liens existants. Seules les trois routes marquées comme
entrées visibles appartiennent à la navigation primaire Agir.

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/actions/history` | [Historique terrain](./routes/02-agir/actions-history/actions-history-README.md) | `protected` ; workflow secondaire protégé hors navigation primaire | agir | `apps/web/src/app/(app)/actions/history/page.tsx` |
| `/actions/new` | [Créer une action](./routes/02-agir/actions-new/actions-new-README.md) | `clerk-context` ; **entrée visible** ; préparation accessible sans compte ; identité requise pour créer, compléter ou envoyer | agir | `apps/web/src/app/(app)/actions/new/page.tsx` |
| `/sections/rejoindre-une-action` | [Rejoindre une action](./routes/02-agir/rejoindre-une-action/rejoindre-une-action-README.md) | `public-visible` ; **entrée visible** ; compte requis pour rejoindre | agir, exception nommée | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/missions/[id]` | [Missions](./routes/02-agir/missions/missions-README.md) | `protected` ; workflow/deep-link hors navigation primaire | agir | `apps/web/src/app/(app)/missions/[id]/page.tsx` |
| `/sections/route` | [Où agir — compatibilité](./routes/02-agir/ou-agir/ou-agir-README.md) | `public-visible` ; redirect vers `/actions/new?panel=itineraire`, hors navigation primaire | agir | `apps/web/src/app/(app)/sections/route/page.tsx` |
| `/sections/weather` | [Météo — compatibilité](./routes/02-agir/weather/weather-README.md) | `public-visible` ; redirect vers `/actions/new?panel=meteo`, hors navigation primaire | agir | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/signalement` | [Signalement déchets](./routes/02-agir/signalement/signalement-README.md) | `clerk-context` ; **entrée visible** ; formulaire accessible sans compte ; identité requise pour transmettre, gérer les preuves et consulter ses observations | agir | `apps/web/src/app/(app)/signalement/page.tsx` |

`/missions/[id]` reste une route dynamique : `[id]` est un segment paramétré
de l'App Router. Cette propriété décrit la forme de la route et ne remplace
pas son contrôle d'accès, qui est `protected`. Cette route sert au workflow et
aux deep-links ; elle ne devient pas une rubrique primaire.

La route `/actions/history` reste documentée et accessible comme workflow
secondaire protégé hors navigation primaire. Les routes `/sections/route` et
`/sections/weather` restent documentées et accessibles pour compatibilité ;
elles redirigent vers le shell `/actions/new` et restent hors navigation
primaire du bloc Agir.

### Alias et redirections Agir

| Route | Cible | Statut |
|---|---|---|
| `/declaration` | `/actions/new` | `redirect` |
| `/sections/guide` | `/actions/new?panel=meteo` | `redirect` avec paramètres conservés |

## Cartographie & Impact

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/actions/map` | [Carte des actions](./routes/03-cartographie-impact/actions-map/actions-map-README.md) | `public-visible` | sky | `apps/web/src/app/(app)/actions/map/page.tsx` |
| `/methodologie` | [Méthodologie](./routes/03-cartographie-impact/methodologie/methodologie-README.md) | `public-visible` | red, exception `methodologie-impact` | `apps/web/src/app/(app)/methodologie/page.tsx` |
| `/sections/gamification` | [Progression & badges](./routes/03-cartographie-impact/gamification/gamification-README.md) | `auth-disabled-gate` | red, exception `reports-impact` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/reports` | [Rapports d'impact](./routes/03-cartographie-impact/reports/reports-README.md) | synthèse publique ; génération/historique compte connecté ; export détaillé tout compte connecté, quota 1/jour | red | `apps/web/src/app/(app)/reports/page.tsx` |

### Alias Cartographie & Impact

| Route | Cible | Statut |
|---|---|---|
| `/gamification` | `/sections/gamification` | `redirect` |

## Réseau & Discussions

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/sections/community` | [Communauté](./routes/04-reseau-discussions/community/community-README.md) | `public-visible` ; consultation publique ; actions nécessitant une identité séparées | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/feedback` | [Idées et problèmes](./routes/04-reseau-discussions/feedback/feedback-README.md) | `public-visible` | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/actors` | [Réseau engagé](./routes/04-reseau-discussions/actors/actors-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/annuaire` | [Annuaire des acteurs](./routes/04-reseau-discussions/annuaire/annuaire-README.md) | `public-visible` ; consultation publique ; référencement via un parcours séparé | violet | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/messagerie` | [Messagerie](./routes/04-reseau-discussions/messagerie/messagerie-README.md) | `auth-blur-gate` | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/open-data` | [Données publiques](./routes/04-reseau-discussions/open-data/open-data-README.md) | `public-visible` | violet | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/funding` | [Soutenir CleanMyMap](./routes/04-reseau-discussions/funding/funding-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/trash-spotter` | [Suivi Trash Spotter](./routes/04-reseau-discussions/trash-spotter/trash-spotter-README.md) | `auth-blur-gate` ; consultation/monitoring secondaire, sans formulaire de création | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/partners/dashboard` | [Annuaire partenaires](./routes/04-reseau-discussions/partners-dashboard/partners-dashboard-README.md) | `protected` | partenaires / réseau | `apps/web/src/app/(app)/partners/dashboard/page.tsx` |
| `/partners/onboarding` | [Onboarding partenaire](./routes/04-reseau-discussions/partners-onboarding/partners-onboarding-README.md) | `protected` | partenaires / réseau | `apps/web/src/app/(app)/partners/onboarding/page.tsx` |

### Alias et redirections Réseau

| Route | Cible | Statut |
|---|---|---|
| `/community` | `/sections/community` | `redirect` |
| `/messagerie` | `/sections/messagerie` | `redirect` |
| `/open-data` | `/sections/open-data` | `redirect` |
| `/partners/network` | `/sections/community?tab=partners` | `redirect` |
| `/partners/network/pepite` | `/sections/community?tab=partners` | `redirect` |
| `/sections/dm` | `/sections/messagerie?tab=dm` | `redirect` gérée dans la route dynamique |

## Apprendre

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/learn/bonnes-pratiques` | [Bonnes pratiques](./routes/05-apprendre/learn-bonnes-pratiques/learn-bonnes-pratiques-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/bonnes-pratiques/page.tsx` |
| `/learn/comprendre` | [Ordres de grandeur](./routes/05-apprendre/learn-comprendre/learn-comprendre-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/comprendre/page.tsx` |
| `/learn/sentrainer` | [S'entraîner](./routes/05-apprendre/learn-sentrainer/learn-sentrainer-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/sentrainer/page.tsx` |
| `/learn/ecole` | [Mode École](./routes/05-apprendre/learn-ecole/learn-ecole-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/ecole/page.tsx` |

Note : aucune page canonique `/learn` n'est documentée dans l'état actuel. Le sitemap ne doit pas l'inventer.

## Auth & Onboarding

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/onboarding` | [Onboarding](./routes/06-auth-onboarding/onboarding/onboarding-README.md) | `auth-entry` | `apps/web/src/app/onboarding/page.tsx` |
| `/sign-in` | [Connexion](./routes/06-auth-onboarding/sign-in/sign-in-README.md) | `auth-entry` | `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` |
| `/sign-up` | [Inscription](./routes/06-auth-onboarding/sign-up/sign-up-README.md) | `auth-entry` | `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` |

### Alias Auth

| Route | Cible | Statut |
|---|---|---|
| `/onboarding/localisation` | `/onboarding` | `redirect` |

## Institutionnel & Légal

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/conditions-generales-utilisation` | [CGU](./routes/07-legal/conditions-generales-utilisation/conditions-generales-utilisation-README.md) | `legal-public` | `apps/web/src/app/conditions-generales-utilisation/page.tsx` |
| `/contact` | [Contact](./routes/07-legal/contact/contact-README.md) | `legal-public` | `apps/web/src/app/contact/page.tsx` |
| `/mentions-legales` | [Mentions légales](./routes/07-legal/mentions-legales/mentions-legales-README.md) | `legal-public` | `apps/web/src/app/mentions-legales/page.tsx` |
| `/politique-confidentialite` | [Politique de confidentialité](./routes/07-legal/politique-confidentialite/politique-confidentialite-README.md) | `legal-public` | `apps/web/src/app/politique-confidentialite/page.tsx` |
| `/politique-cookies` | [Politique cookies](./routes/07-legal/politique-cookies/politique-cookies-README.md) | `legal-public` | `apps/web/src/app/politique-cookies/page.tsx` |
| `/signaler-contenu-illicite` | [Notification de contenu illicite](./routes/07-legal/signaler-contenu-illicite/signaler-contenu-illicite-README.md) | `legal-public` | `apps/web/src/app/signaler-contenu-illicite/page.tsx` |

### Alias légaux

| Route | Cible | Statut |
|---|---|---|
| `/conditions-utilisation` | `/conditions-generales-utilisation` | `redirect` |
| `/en` | `/` | `redirect` |

## Système & Utilitaires

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/error/429` | [Erreur 429](./routes/08-systeme-utilitaires/error-429/error-429-README.md) | `public-visible` | `apps/web/src/app/error/429/page.tsx` |
| `/form-comparison` | [Comparaison de formulaires](./routes/08-systeme-utilitaires/form-comparison/form-comparison-README.md) | `protected` | `apps/web/src/app/form-comparison/page.tsx` |
| `/preview/actions/new` | [Preview déclaration](./routes/08-systeme-utilitaires/preview-actions-new/preview-actions-new-README.md) | `standalone` | `apps/web/src/app/preview/actions/new/page.tsx` |
| `/reglages` | [Réglages](./routes/08-systeme-utilitaires/reglages/reglages-README.md) | `protected` | `apps/web/src/app/reglages/page.tsx` |
| `/sections/[sectionId]` | pattern dynamique partagé — pas une page autonome | `dynamic` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |

Le pattern `/sections/[sectionId]` est un mécanisme de rendu partagé. Les
sections concrètes sont inventoriées par leurs routes runtime ci-dessus et dans
le registre des sections ; le pattern ne possède donc pas de fiche de page
propre.

## Admin & Super-admin

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/admin` | [Administration](./routes/09-admin-superadmin/admin/admin-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/page.tsx` |
| `/admin/forms` | [Administration des formulaires](./routes/09-admin-superadmin/admin-forms/admin-forms-README.md) | `protected` | `apps/web/src/app/(app)/admin/forms/page.tsx` |
| `/admin/gamification/xp-audit` | [XP Audit](./routes/09-admin-superadmin/admin-gamification-xp-audit/admin-gamification-xp-audit-README.md) | `protected` + permissions internes | `apps/web/src/app/admin/gamification/xp-audit/page.tsx` |
| `/admin/godmode` | [Administration avancée](./routes/09-admin-superadmin/admin-godmode/admin-godmode-README.md) | `max-only` | `apps/web/src/app/(app)/admin/godmode/page.tsx` |
| `/admin/quiz-bank` | [Banque de quiz](./routes/09-admin-superadmin/admin-quiz-bank/admin-quiz-bank-README.md) | `admin-like` | `apps/web/src/app/(app)/admin/quiz-bank/page.tsx` |
| `/admin/services` | [Administration des services](./routes/09-admin-superadmin/admin-services/admin-services-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/services/page.tsx` |

## Print & Export

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/prints/report` | [Rapport imprimable](./routes/10-print-export/prints-report/prints-report-README.md) | `protected` | `apps/web/src/app/(app)/prints/report/page.tsx` |

## Sections runtime à classer

Ces sections existent dans le registre et le renderer, mais leur famille documentaire définitive n'est pas arbitrée ici.

| Route | Label runtime | Accès | Statut documentaire |
|---|---|---|---|
| `/sections/recycling` | Guide du tri | `public-visible` | famille à arbitrer |
| `/sections/compost` | Compostage | `public-visible` | famille à arbitrer |
| `/sections/climate` | Comprendre l'enjeu | `public-visible` | famille à arbitrer |

Ne pas créer leurs dossiers canoniques dans une famille arbitraire avant décision.

## Sources techniques de référence

```txt
apps/web/src/app/**/page.tsx
apps/web/src/lib/sections-registry/config.ts
apps/web/src/proxy.ts
apps/web/src/lib/seo/indexability.ts
apps/web/src/lib/ui/page-families/resolve-page-family.ts
apps/web/src/lib/ui/page-families/exceptions.ts
```

## Maintenance

Après ajout, suppression ou déplacement d'une route :

```bash
npm run audit:pages-site-drift
```

Le script doit signaler :

- route code absente de l'index ;
- section runtime absente de l'index ;
- route d'index sans runtime ;
- fiche canonique manquante ;
- noyau documentaire incomplet.
