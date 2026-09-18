# Partie XI — Audit technique de sobriété {#partie-xi-audit-technique-de-sobriete}

[!NOTE] **Rattachement éditorial** : cette section prolonge la **Partie I — Méthodologie et diagnostic** . Elle documente le coût technique réel du interface client, du serveur, des dépendances et des usages IA.

Cette section identifie les principaux postes de consommation numérique, énergétique et computationnelle visibles dans l'état courant du dépôt. Elle ne remplace pas une mesure Lighthouse, WebPageTest, `next build --analyze` ou traces de production, mais elle permet de repérer les sources probables de surcoût à partir de l'architecture, du code, des dépendances et des flux de travail, en s'appuyant sur une démarche de sobriété numérique. Une utilité forte ne suffit pas si elle repose sur une architecture trop coûteuse pour l'usage réellement rendu, conformément aux recommandations du W3C. [@w3c_sustainability_web_1]

Repères locaux utilisés : application Next.js/React dans `apps/web` avec 973 fichiers sources dans `apps/web/src`, 55 fichiers de routes API, 252 fichiers déclarés comme composants ou modules client, 95 imports de `framer-motion`, 44 usages de SWR, 64 occurrences de `fetch(` dans `apps/web/src`, 24 occurrences de `no-store`, 3 exports `revalidate`, 5 PNG publics et 1 WebP public jusqu'à environ 738 Ko, Leaflet et Leaflet Draw présents, mesures d'audience PostHog/Vercel/Sentry conditionnées par consentement ou configuration. ADEME, _Lancez votre démarche de numérique responsable_, Lien

## Cartographie des coûts numériques

| Zone                    | Source de coût           | Mécanisme              | Impact probable       | Confiance | Solution concrète        |
| ----------------------- | ------------------------ | ---------------------- | --------------------- | --------- | ------------------------ |
| interface client global | Client components        | plus de JavaScript     | moyen à fort          | élevée    | réduire les              |
|                         | nombreux                 | à hydrater, plus de    |                       |           | composants`use`          |
|                         |                          | rendu côté             |                       |           | `client`, isoler         |
|                         |                          | navigateur             |                       |           | l'interactivité par      |
|                         |                          |                        |                       |           | îlot                     |
| Animations              | `framer-motion`          | bundle plus lourd,     | moyen                 | élevée    | réserver Framer          |
|                         | importé                  | calculs d'animation,   |                       |           | Motion aux               |
|                         | massivement              | re-renders             |                       |           | interactions clés,       |
|                         |                          |                        |                       |           | CSS transitions          |
|                         |                          |                        |                       |           | ailleurs                 |
| Cartographie            | Leaflet, React           | scripts lourds, tuiles | fort sur pages carte  | élevée    | chargement               |
|                         | Leaflet, clusters,       | réseau, rendu DOM      |                       |           | dynamique strict,        |
|                         | Leaflet Draw             | des marqueurs          |                       |           | cluster serveur ou       |
|                         |                          |                        |                       |           | pagination spatiale      |
| CSS global              | CSS Leaflet chargé       | feuilles de style      | faible à moyen        | élevée    | importer CSS             |
|                         | dans`layout.tsx`         | envoyées même          |                       |           | seulement dans les       |
|                         |                          | hors carte             |                       |           | segments                 |
|                         |                          |                        |                       |           | cartographiques          |
| Données temps           | SWR + refresh            | revalidation           | moyen à fort selon    | moyenne   | désactiver refresh       |
| réel                    | global 30 s              | automatique et         | pages                 |           | par défaut, activer      |
|                         |                          | appels répétés         |                       |           | seulement chat/live      |
| API                     | 57 routes API            | surface serveur        | moyen                 | élevée    | fusionner routes         |
|                         |                          | large, validations,    |                       |           | proches, cache           |
|                         |                          | appels DB et logs      |                       |           | contrôlé, budget         |
|                         |                          |                        |                       |           | endpoints                |
| Stockage                | photos d'actions         | upload, stockage,      | fort si usage terrain | élevée    | compression client,      |
|                         | Supabase Storage         | backups,               | réel                  |           | quotas, durée de         |
|                         |                          | consultation           |                       |           | conservation,            |
|                         |                          | répétée                |                       |           | miniatures               |
| mesure d'audience       | PostHog, Vercel          | événements,            | moyen                 | élevée    | consentement             |
|                         | mesure d'audience, Speed | scripts, stockage,     |                       |           | strict, échantillonnage, |
|                         | Insights, funnel         | traitement externe     |                       |           | événements               |
|                         | local                    |                        |                       |           | actionnables             |
|                         |                          |                        |                       |           | uniquement               |
| Observabilité           | Sentry                   | collecte d'erreurs,    | faible à moyen        | moyenne   | garder seulement         |
|                         |                          | sourcemaps, traces     |                       |           | erreurs critiques,       |
|                         |                          | éventuelles            |                       |           | échantillonnage faible   |
| CI/CD                   | deux jobs GitHub         | calcul répété à        | moyen                 | élevée    | chemins filtrés, jobs    |
|                         | avec`npm ci`,            | chaque push et PR      |                       |           | mutualisés, tests        |
|                         | typecheck, lint,         |                        |                       |           | lourds planifiés         |
|                         | tests                    |                        |                       |           |                          |

| Zone            | Source de coût        | Mécanisme            | Impact probable     | Confiance | Solution concrète    |
| --------------- | --------------------- | -------------------- | ------------------- | --------- | -------------------- |
| compilations    | Next.js/Vercel        | compilation, traces, | moyen               | moyenne   | ignorer docs-only,   |
|                 | aperçus               | déploiements         |                     |           | regrouper            |
|                 |                       | temporaires          |                     |           | Dependabot, limiter  |
|                 |                       |                      |                     |           | aperçus              |
| IA              | Pinecone déclaré,     | risque d'activation  | faible actuel, fort | moyenne   | fonctionnalité flag, |
|                 | OpenAI dans config    | coûteuse sans        | potentiel           |           | mesure par appel     |
|                 | Supabase, textes      | preuve d'utilité     |                     |           | IA, fallback         |
|                 | "IA"                  |                      |                     |           | déterministe         |
| Rapports/export | `html-to-image`,      | génération           | moyen sur rapports  | moyenne   | exports              |
|                 | PDF HTML,             | client/serveur,      |                     |           | asynchrones,         |
|                 | CSV/JSON              | mémoire, payloads    |                     |           | cache, limiter       |
|                 |                       |                      |                     |           | graphiques lourds    |
| Dépendances     | `xlsx`,               | poids bundle ou      | faible à moyen      | moyenne   | import dynamique,    |
|                 | `react-big-calendar`, | maintenance si       |                     |           | suppression si       |
|                 | `swiper`,             | chargés côté client  |                     |           | usage marginal       |
|                 | `canvas-confetti`     |                      |                     |           |                      |

Les coûts dominants ne sont pas les pages statiques ou le texte. Les coûts probables sont concentrés dans quatre familles : carte interactive, hydratation React, stockage photo et répétition des appels réseau/CI.

### Analyse interface client

L'interface client est riche, visuelle et très interactive. Cette richesse améliore l'expérience sur certains parcours, mais elle augmente la dette de sobriété dès qu'elle s'étend à des pages qui pourraient rester statiques ou peu interactives. Le coût n'est pas seulement esthétique : il se traduit par davantage de JavaScript à télécharger, plus de travail d'hydratation, davantage de re-rendus et un effort supérieur sur mobile.

L'analyse montre donc un arbitrage classique : plus l'interface cherche à être homogène et animée, plus elle risque d'imposer un coût invisible aux pages simples. Pour CleanMyMap, la bonne règle consiste à réserver les composants interactifs aux parcours qui en ont besoin vraiment, et à laisser les contenus éditoriaux, légaux ou descriptifs rester aussi légers que possible.

### Hydratation excessive

Mécanisme : beaucoup de composants client et de hooks ( `useSWR` , `useEffect` , `useState` ) déplacent du travail vers le navigateur. Chaque page interactive impose téléchargement JavaScript, parsing, hydratation et re-renders.

Impact probable : moyen à fort sur mobile, surtout sur pages carte, rapports, sections pédagogiques et tableaux de bord. Confiance : élevée, car 252 fichiers contiennent `use client`.

Solution : transformer les zones statiques en Server Components, garder l'interactivité dans de petits composants îlots, et éviter que des sections éditoriales complètes soient rendues côté client.

### Framer Motion utilisé comme outil d'animation généraliste

Mécanisme : `framer-motion` est importé dans 95 fichiers. La librairie est puissante mais disproportionnée pour des fades, hover, apparitions simples ou petits compteurs.

Impact probable : moyen. Le coût dépend du élagage des importations inutiles et des pages réellement chargées, mais l'usage large augmente le bundle, le coût de rendu et la maintenance.

Confiance : élevée

Solution : conserver Framer Motion pour transitions complexes réellement utiles, remplacer les animations décoratives par CSS, supprimer les animations non essentielles sur mobile ou `prefers-reduced-motion` .

### Cartographie lourde

Mécanisme : Leaflet, React Leaflet, Leaflet Draw, clusters et tuiles cartographiques peuvent générer beaucoup de DOM, requêtes réseau et calculs côté client. Les pages carte concentrent les coûts de rendu.

Impact probable : fort sur `/actions/map` , composants `actions-map-canvas` , `action-drawing-map` , `mission-map` , annuaire/compost maps.

Confiance : élevée

Solution : charger la carte uniquement à l'ouverture de l'onglet carte, limiter le nombre de points transmis, pré-agréger côté serveur, mettre en cache les résultats par zone, proposer une vue liste par défaut sur mobile.

### CSS et dépendances cartographiques globales

Mécanisme : `layout.tsx` importe les CSS Leaflet et Leaflet Draw globalement. Même les pages sans carte peuvent recevoir du CSS inutile.

Impact probable : faible à moyen, mais facile à corriger.

Confiance : élevée.

Solution : déplacer ces imports vers les composants ou layouts cartographiques, ou vers un segment route dédié.

### Composants probablement énergivores

Composants à surveiller :

- `actions-map-canvas.tsx` et `map-layers.tsx` : rendu carte, clusters, marqueurs;

- `action-drawing-map.tsx` : dessin Leaflet Draw, gestion mobile, événements carte;

- `chat-shell` et `use-chat-data.ts` : SWR, realtime Supabase, messages, utilisateurs;

- `reports-web-document.tsx` et `use-reports-web-document-model.ts` : multiples requêtes SWR, agrégations, exports;

- `analytics-cockpit` et composants rapports animés : graphiques et calculs;

- `accueil-*` , `rubriques/*` , `learn/*` utilisant Framer Motion : animations nombreuses;

- `profil/impact/page.tsx` : `html-to-image` , confetti, gamification.

Impact probable : fort pour cartes et rapports, moyen pour animations, faible à moyen pour confetti/QR/export ponctuel.

Confiance : moyenne à élevée.

Solution : instrumentation par page avec analyseur de paquets, React Profiler, Web Vitals et mesure du nombre de requêtes par navigation.

## Analyse du poids, du réseau et du stockage

### Estimation du poids moyen des pages

Sans compilation analyzer, l'estimation doit rester prudente :

| Type de page                 | Poids transféré probable hors cache | Commentaire                        |
| ---------------------------- | ----------------------------------- | ---------------------------------- |
| page texte simple/legal      | 150 à 400 Ko                        | surtout framework, CSS, layout,    |
|                              |                                     | auth/mesure d'audience si activés  |
| page accueil riche           | 500 Ko à 1,5 Mo                     | animations, composants visuels,    |
|                              |                                     | éventuelles images                 |
| page rapport/tableau de bord | 700 Ko à 2 Mo                       | graphiques, SWR, agrégations,      |
|                              |                                     | exports                            |
| page carte                   | 1 à 3 Mo ou plus                    | Leaflet, clusters, tuiles, données |
|                              |                                     | points                             |
| page avec gros assets docs   | +500 Ko à +2,6 Mo                   | les PNG publics de documentation   |
|                              |                                     | totalisent plusieurs Mo            |

Ces chiffres ne sont pas des mesures de production. Ils indiquent les ordres de grandeur à mesurer par `next build --analyze` et tests réseau.

## Analyse serveur et API

Le serveur est large : routes API d'actions, carte, rapports, admin, chat, communauté, newsletter, notifications, pilotage, santé, Stripe, services, météo, itinéraire. Cette richesse crée des coûts de calcul et de maintenance.

### Endpoints probablement les plus coûteux

| Endpoint ou famille                                  | Mécanisme de coût        | Impact probable         | Confiance | Solution              |
| ---------------------------------------------------- | ------------------------ | ----------------------- | --------- | --------------------- |
| `/api/chat`                                          | gros fichier route,      | moyen à fort            | élevée    | pagination stricte,   |
|                                                      | plusieurs requêtes       |                         |           | cache utilisateurs,   |
|                                                      | Supabase, notifications, |                         |           | limiter realtime      |
|                                                      | filtres utilisateurs     |                         |           |                       |
| `actions_map_feed`                                   | données                  | fort si carte populaire | élevée    | tuilage logique,      |
|                                                      | cartographiques          |                         |           | bounding box, cache 1 |
|                                                      | publiques, filtres,      |                         |           | à 10 min, champs      |
|                                                      | payload de points        |                         |           | minimaux              |
| `/api/reports/actions.csv`<br>export potentiellement |                          | moyen à fort            | élevée    | cache par période,    |
| et`.json`                                            | large,`no-store`         |                         |           | export asynchrone,    |
|                                                      |                          |                         |           | limites de lignes     |

| Endpoint ou famille                                | Mécanisme de coût       | Impact probable | Confiance | Solution                      |
| -------------------------------------------------- | ----------------------- | --------------- | --------- | ----------------------------- |
| `/api/reports/elus-dossier`<br>génération dossier, |                         | moyen           | moyenne   | pré-calculer indicateurs,     |
|                                                    | `no-store`, logique     |                 |           | cache court                   |
|                                                    | volumineuse             |                 |           |                               |
| `/api/community/events`                            | plusieurs requêtes      | moyen           | élevée    | pagination, cache,            |
|                                                    | Supabase, listes        |                 |           | index DB                      |
|                                                    | publiques               |                 |           |                               |
| `/api/admin/moderation`                            | mises à jour et         | moyen           | élevée    | batch contrôlé, logs          |
|                                                    | sélections multi-tables |                 |           | limités                       |
| `/api/route/recommend`                             | recommandation          | moyen           | moyenne   | cache par zone, éviter        |
|                                                    | d'itinéraire, logique   |                 |           | IA distante si                |
|                                                    | potentiellement         |                 |           | heuristique suffit            |
|                                                    | complexe                |                 |           |                               |
| `/api/analytics/funnel`                            | collecte fréquente      | moyen si trafic | moyenne   | échantillonnage et agrégation |
|                                                    | d'événements            |                 |           | côté client                   |
| `/api/health`,                                     | checks récurrents       | faible à moyen  | moyenne   | fréquence basse, cache        |
| `/api/services`,                                   |                         |                 |           | très court                    |
| `/api/uptime`                                      |                         |                 |           |                               |

### Usage fréquent de `no-store`

Mécanisme : 24 occurrences de `no-store` empêchent la réutilisation de réponses. C'est légitime pour données privées ou exports sensibles, mais coûteux pour rapports publics ou données peu volatiles.

Impact probable : moyen.

Confiance : élevée.

Solution : distinguer privé/public, utiliser `revalidate` , `ETag` , `Cache-Control: stale-while-revalidate` , et des caches par période ou territoire.

### Agrégations répétées

Mécanisme : tableaux de bord et rapports peuvent recalculer des totaux, séries mensuelles, zones, qualité de données et métriques à chaque session.

Impact probable : moyen à fort si les rapports deviennent consultés.

Confiance : moyenne.

Solution : tables matérialisées ou vues pré-calculées, refresh programmé, cache applicatif par période.

### Requêtes et traitements à optimiser

Le diagnostic serveur suggère de réduire les routes redondantes, de pré-calculer les exports et les agrégations consultées souvent, et de réserver `no-store` aux données réellement volatiles ou sensibles.

### Images

Les assets publics visibles sont raisonnables en nombre. **Optimisation réalisée (Mai 2026)** : le logo principal ( `logo-cleanmymap.webp` ) a été converti de PNG (511 Ko) en WebP (58 Ko), soit une réduction de **88 %** . Cependant, plusieurs PNG de documentation restent lourds : environ 738 Ko, 615 Ko, 590 Ko, 499 Ko et 162 Ko. Le coût principal futur vient surtout des photos terrain uploadées vers Supabase Storage.

Impact probable : fort à long terme.

Confiance : élevée.

Solutions :

— continuer la conversion des PNG de documentation en WebP/AVIF;

- créer des miniatures pour cartes et listes;

- compresser côté client avant upload;

- fixer une taille maximale, par exemple 1600 px côté long et 300 à 500 Ko par photo;

- supprimer ou archiver les photos non utiles après validation.

### Vidéos

Aucune présence évidente de vidéos publiques dans l'ancien dossier `apps/web/public`. Le risque vidéo actuel semble faible.

Impact probable : faible aujourd'hui.

Confiance : moyenne.

Solution : éviter l'ajout de vidéos autoplay; préférer image poster + lien externe si besoin.

### Fonts

Le dépôt ne montre pas de gros fichiers de fonts publics. Le coût vient plutôt des classes, du CSS et du framework que de fichiers fonts locaux.

Impact probable : faible.

Confiance : moyenne.

Solution : limiter les variantes, préférer fonts système si l'identité visuelle le permet.

### Requêtes réseau redondantes

SWR est utilisé largement. Le fichier `swr-config.ts` définit un `refreshInterval` global à 30 secondes pour les flux live. Si cette valeur s'applique trop largement, elle peut revalider des données qui ne changent pas souvent.

Impact probable : moyen à fort selon propagation de la config.

Confiance : moyenne.

Solution : aucun intervalle global par défaut; refresh explicite seulement pour chat, statut ou événements live; désactiver `revalidateOnFocus` sur rapports lourds.

### Stockage et fichiers persistants

Le réseau et le stockage sont les postes écologiques les plus concrets du projet. Les fichiers persistants à surveiller sont surtout les photos terrain, les exports, les caches et les sauvegardes qui continuent d'occuper de l'espace sans utilité immédiate.

## Analyse CI/CD et dépendances

La CI GitHub exécute deux jobs principaux sur `push` et `pull_request` : `fast-checks` et `security-checks` . Les deux font checkout, setup Node, `npm ci` , secret audit, puis tests ou contrôles.

Mécanismes de coût :

— `npm ci` répété dans deux jobs;

— typecheck, lint et tests à chaque push et PR;

— Dependabot hebdomadaire sur racine, `apps/web` et GitHub Actions;

- aperçus Vercel probables hors GitHub Actions;

- compilation Next.js côté Vercel pour chaque changement pertinent.

Impact probable : moyen. Ce n'est pas le principal poste au faible trafic, mais c'est un coût cumulatif invisible. Confiance : élevée.

Solutions :

- **Réalisé (Mai 2026)** : ajout de filtres de chemins ( `paths-ignore` ) pour éviter le déclenchement de la CI lourde lors de modifications de documentation ou d'assets;

— mutualiser l'installation ou utiliser un job unique avec étapes conditionnelles;

— garder tests sécurité ciblés, mais éviter de relancer toute la chaîne pour changements non applicatifs;

— regrouper Dependabot et limiter les aperçus complètes;

— définir un budget : compilations/mois, minutes CI/mois, compilations échoués/mois.

### Coût des compilations, aperçus et déploiements

Le coût de la chaîne d'intégration et de déploiement reste modéré mais cumulatif : jobs répétés, aperçus, compilations Vercel et dépendances d'automatisation peuvent devenir significatifs si le rythme de modification augmente.

Ce coût devient plus visible quand chaque petite modification déclenche des compilations complets, des aperçus de validation et des relances répétées par des agents ou scripts de développement. Le problème n'est pas seulement le calcul ponctuel, mais l'accumulation de cycles inutiles dans un projet qui itère vite.

### Comparaison entre une session Codex et un cycle GitHub/Vercel

Pour CleanMyMap, la comparaison utile n'est pas entre "Codex" et "GitHub" au sens abstrait, mais entre une **heure de session de code assistée par Codex** et un **cycle réel de modification** composé d'un push, de jobs GitHub Actions éventuels, d'un build Vercel et d'un déploiement. Vercel documente que les builds sont exécutés à chaque déploiement, notamment lorsqu'un commit est poussé vers un dépôt connecté, et que les régions d'exécution des fonctions peuvent être configurées séparément [@vercel_builds; @vercel_deployments_overview; @vercel_functions_region].

Sur la base des hypothèses retenues dans ce rapport, une heure de session Codex correspond à environ **1 kWh** et **0,2 kgCO₂e**, tandis qu'un cycle GitHub/Vercel léger reste de l'ordre de **0,1 kWh** et **0,04 à 0,05 kgCO₂e** si le build est exécuté dans une région à forte intensité carbone comme `iad1`. Le tableau ci-dessous donne un ordre de grandeur prudent :

| Scénario                                    | Électricité |                CO₂e | Lecture                                       |
| ------------------------------------------- | ----------: | ------------------: | --------------------------------------------- |
| 1 h de session Codex                        |      ~1 kWh |         ~0,2 kgCO₂e | coût de travail assisté continu               |
| 1 push GitHub + 1 build/déploiement Vercel  |    ~0,1 kWh | ~0,04 à 0,05 kgCO₂e | coût d'un cycle d'itération léger             |
| 1 push + plusieurs jobs CI + aperçus Vercel |    >0,1 kWh |        >0,05 kgCO₂e | coût cumulatif lorsque la chaîne se multiplie |

La conclusion à retenir est simple : une heure de session Codex pèse environ dix fois plus qu'un petit cycle GitHub/Vercel en énergie, et souvent davantage en carbone dès que la chaîne de déploiement reste compacte. À l'inverse, si la CI se charge de tests multiples, d'aperçus répétés ou de relances inutiles, le coût du cycle grimpe rapidement. Pour CleanMyMap, le levier de réduction principal n'est donc pas de supprimer ces outils, mais de réduire le nombre de sessions longues et le nombre de cycles déclenchés sans gain réel.

### Analyse des dépendances

Dépendances à surveiller :

Chaque dépendance ajoute du code à télécharger, auditer, maintenir, builder et parfois exécuter côté client. Les bibliothèques lourdes utilisées pour des usages simples peuvent donc augmenter l'empreinte sans bénéfice proportionné. C'est particulièrement vrai pour les animations, les graphiques, les cartes, les tableaux de bord, les exports PDF ou les mesures d'audience.

| Dépendance      | Risque sobriété       | Impact probable | Confiance | Action                   |
| --------------- | --------------------- | --------------- | --------- | ------------------------ |
| `framer-motion` | usage très large pour | moyen           | élevée    | réduire et remplacer par |
|                 | animations            |                 |           | CSS                      |

| Dépendance                                            | Risque sobriété                  | Impact probable         | Confiance | Action                     |
| ----------------------------------------------------- | -------------------------------- | ----------------------- | --------- | -------------------------- |
| `leaflet`,                                            | carte lourde et tuiles           | fort sur carte          | élevée    | lazy load, bbox, clusters  |
| `react-leaflet`,                                      |                                  |                         |           | pré-calculés               |
| `leaflet-draw`, cluster                               |                                  |                         |           |                            |
| `recharts`                                            | graphiques tableau de bord       | moyen                   | moyenne   | charger uniquement         |
|                                                       |                                  |                         |           | rapports                   |
| `react-big-calendar`                                  | calendrier lourd pour            | faible à moyen          | moyenne   | remplacer si usage         |
|                                                       | ressources                       |                         |           | simple                     |
| `html-to-image`                                       | export image coûteux             | faible à moyen ponctuel | moyenne   | charger à la demande       |
| `xlsx`                                                | dépendance lourde,               | moyen                   | moyenne   | limiter aux scripts        |
|                                                       | source CDN tarball               |                         |           | serveur/admin,             |
|                                                       |                                  |                         |           | envisager CSV              |
| `posthog-js`+                                         | mesure d'audience client/serveur | moyen                   | élevée    | échantillonnage et         |
| `posthog-node`                                        |                                  |                         |           | événements minimaux        |
| `@sentry/nextjs`                                      | instrumentation                  | faible à moyen          | moyenne   | activation stricte, pas de |
|                                                       |                                  |                         |           | traces par défaut          |
| `@pinecone-database/pinecone`<br>service IA/vectoriel |                                  | faible actuel, fort si  | moyenne   | retirer si non utilisé en  |
|                                                       |                                  | activé                  |           | production                 |
| `canvas-confetti`                                     | animation décorative             | faible                  | élevée    | supprimer ou lazy load     |
| `swiper`                                              | carrousels                       | faible à moyen          | faible    | vérifier usage réel,       |
|                                                       |                                  |                         |           | supprimer si inutilisé     |

Le problème n'est pas l'existence d'une librairie lourde, mais son chargement sur des pages où elle n'apporte pas d'utilité proportionnée.

### Dépendances lourdes ou redondantes

#### Réalisées (Mai 2026)

1. **Isolation CSS Leaflet** : Déplacement des CSS Leaflet hors du layout global vers un chargement dynamique.

2. **Filtrage CI/CD** : Ajout de filtres de chemins ( `paths-ignore` ) pour la documentation.

[!NOTE] **Optimisation Assets** : Logo converti en WebP ( **-88 % de poids** ), réduisant drastiquement la bande passante consommée.

1. **Modularisation Sobriété** : Extraction des données du `recycling-assistant` et du composant `FormProgressSummary` pour réduire la complexité et améliorer la performance.

## Priorisation de l'audit technique

### Optimisations réalisées

#### Faible effort / fort impact (À faire)

1. Désactiver le refresh SWR global et le rendre opt-in.

2. Continuer la compression des PNG publics lourds en WebP/AVIF.

3. Mettre des limites strictes aux photos uploadées.

4. Réduire les événements mesure d'audience aux décisions produit utiles.

5. Charger `html-to-image` , confetti, calendrier et graphiques uniquement à la demande.

### Fort effort / fort impact

1. Refondre les pages carte autour de bounding boxes, pagination spatiale et agrégations serveur.

2. Convertir les sections statiques client en Server Components.

3. Pré-calculer les rapports et tableaux de bord lourds.

4. Supprimer ou fusionner les routes API redondantes.

5. Établir une architecture de données unique Supabase avec exports maîtrisés.

### Micro-optimisations

— remplacer certaines animations Framer Motion par CSS;

- supprimer confetti sur mobile ou mode économie;

- limiter `revalidateOnFocus` sur SWR;

- réduire les imports d'icônes si le élagage des importations inutiles ne suffit pas;

- réduire les logs console côté client.

### Gains négligeables ou secondaires

- optimiser les SVG déjà très petits;

- chercher des gains sur les pages légales statiques avant les cartes;

- supprimer quelques classes CSS isolées;

- micro-optimiser du texte ou des composants rarement visités.

### Estimation des gains possibles

| Action                               | Gain potentiel                                          | Confiance |
| ------------------------------------ | ------------------------------------------------------- | --------- |
| Compression images + miniatures      | -30 % à -80 % sur médias transférés                     | élevée    |
| Lazy loading strict des cartes       | -300 Ko à -1,5 Mo sur pages non carte                   | moyenne   |
| Réduction Framer Motion              | -50 à -200 Ko JS selon routes                           | moyenne   |
| SWR opt-in au lieu de refresh global | -20 % à -70 % de requêtes sur tableaux de bord inactifs | moyenne   |
| Cache rapports/exports               | -30 % à -90 % de calcul serveur sur consultations       | moyenne   |
|                                      | répétées                                                |           |
| CI filtrée docs-only                 | -10 % à -40 % de minutes CI selon activité              | moyenne   |
| Suppression dépendances inutilisées  | gain variable, surtout maintenance                      | moyenne   |

Gain global plausible : **20 % à 40 %** de réduction des coûts numériques courants sans perte d'utilité, surtout via médias, cartes, caching et CI. Un gain supérieur, **40 % à 60 %** , demanderait une simplification produit plus nette : moins de tableaux de bord, moins de gamification, moins de pages secondaires, moins de services logiciel en tant que service actifs.

### Pistes de simplification technique

Architecture recommandée :

- **Core public léger** : accueil, déclaration simple, carte, rapports publics, méthodologie. Pages majoritairement Server Components.

- **Carte isolée** : segment dédié, import dynamique Leaflet, données par bbox, cluster serveur, vue liste par défaut mobile.

- **API réduite** : routes regroupées par domaine, cache court sur lectures publiques, `no-store` réservé au privé.

- **Données sobres** : Supabase source de vérité, photos compressées, miniatures, rétention, exports CSV/JSON simples.

- **mesures d'audience minimales** : consentement, échantillonnage, événements centrés sur actions réelles, pas de tracking décoratif.

- **CI graduée** : contrôles rapides par défaut, tests lourds programmés, aperçus ignorées pour docs-only.

- **IA optionnelle** : aucun appel IA dans les parcours critiques tant qu'une heuristique suffit; mesure par appel, budget mensuel, fallback sans IA.

- **Fonctions secondaires figées** : chat, gamification avancée, sponsor portal, sandbox, recommandations IA, vectoriel seulement si usage prouvé.

Fonctionnalités pouvant être simplifiées ou supprimées avec faible perte d'utilité si les métriques restent faibles :

- confetti, badges décoratifs, classements;

- carrousels et animations d'accueil non essentielles;

- tableaux de bord qui dupliquent les rapports;

- chat si la coordination se fait déjà par email ou messagerie existante;

- sponsor portal s'il n'y a pas de sponsors actifs;

- calendrier riche si une liste d'événements suffit;

- IA de tri/recommandation si elle n'améliore pas réellement l'action terrain;

- exports visuels complexes si CSV/PDF simple répond au besoin.

## Bilan critique de l'audit technique

CleanMyMap n'est pas un projet intrinsèquement gaspilleur : sa finalité terrain peut justifier une application web, une carte, une base de données et des rapports. Mais son niveau de sophistication est déjà supérieur au strict nécessaire pour coordonner des actions locales.

Les plus gros risques de sobriété sont invisibles : hydratation React généralisée, animations partout, revalidations SWR, routes API nombreuses, exports non cachés, CI répétée, stockage photo et multiplication des services tiers. Ce sont des coûts diffus, faciles à ignorer parce qu'ils ne se voient pas dans l'interface.

### Résultats principaux

La stratégie la plus crédible consiste à mesurer puis réduire : poids par page, requêtes par session, stockage par action, compilations par mois, événements mesure d'audience par utilisateur et temps de maintenance par fonctionnalité. La sobriété ne doit pas être une couche esthétique ou un argument marketing; elle doit devenir une règle d'arbitrage produit.

### Limites de l'audit

L'audit reste fondé sur des ordres de grandeur issus du dépôt, de la configuration et des dépendances visibles. Il ne remplace pas des mesures instrumentées en production, mais il suffit à identifier les postes dominants et les simplifications les plus plausibles.

### Actions techniques à suivre

En synthèse, le projet peut rester soutenable s'il garde le noyau action-carte-rapport et traite le reste comme optionnel. À l'inverse, si chaque idée utile devient une page, un service, une animation, une métrique et une route API, la dette écologique et technique progressera plus vite que l'utilité réelle.
