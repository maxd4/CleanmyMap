# Gouvernance des coûts plateforme — CleanMyMap

## Objet, portée et statut

Ce document est la **source `CURRENT` unique** pour les décisions durables de coût,
de placement et de déclenchement entre Vercel, Supabase, le navigateur, les
fournisseurs externes et les assets préparés. Il s'applique aux fonctionnalités
nouvelles et aux évolutions des parcours existants, sur Web et sur leurs
consommateurs mobiles lorsqu'ils partagent les mêmes contrats serveur.

Il définit **les règles à respecter**, non un inventaire de tâches terminées.
Les exemples de surfaces décrivent une **politique produit cible** ; ils ne
prouvent ni son intégration dans le code, ni son déploiement. La vérité runtime
reste le code et ses tests sur `main`, puis les mesures des services connectés.

Ce fichier ne contient ni backlog daté, ni classement ponctuel de routes, ni
compteur de quota. Les diagnostics historiques, leurs dates, SHAs et limites
sont conservés dans [`audits/`](./audits/) ; les rapports reproductibles sous
`artifacts/`. Un audit statique ne constitue pas une mesure de production.

Sources complémentaires :

- [Gouvernance des données](../architecture/data-governance.md) : sources de vérité et cycle de vie.
- [Capacités d'autorisation](../security/authorization-capabilities.md) : AuthN, AuthZ, RLS et scopes.
- [Playbook Supabase](../database/supabase-table-optimization-playbook.md) : plans d'exécution, index et requêtes.
- [Découpage client/serveur](../development/client-server-bundle-splitting.md) : frontières Next.js et poids du navigateur.
- [Documentation de test](../development/TESTING.md) : niveaux de preuve.

**Invariant supérieur :** la sécurité, les permissions, l'intégrité des données,
les obligations légales et les informations nécessaires à l'utilisateur ne
sont jamais sacrifiées pour économiser un quota.

## 1. Les trois catégories de fonctionnalités

Chaque **opération distante**, et non nécessairement chaque page entière, doit
être classée en l'une des catégories suivantes avant toute nouvelle lecture,
fonction Vercel, actualisation, récupération média ou calcul serveur.

| Catégorie | Définition | Déclenchement attendu | Optimisation prioritaire |
|---|---|---|---|
| **A — Essentielle** | Nécessaire immédiatement pour rendre la surface utile, sûre, accessible ou cohérente : autorisation, contenu principal, rendez-vous d'action, alertes importantes. | Automatique, mais uniquement au moment et sur l'audience réellement nécessaires. | Projection minimale, statique/ISR, cache compatible, lectures bornées, suppression de doublons. |
| **B — Facultative et potentiellement coûteuse** | Analyse approfondie, statistiques secondaires, export, comparaison, grande carte secondaire, historique ou diagnostic que l'utilisateur peut choisir de ne pas consulter. | Après une intention explicite : clic, ouverture volontaire d'un onglet ou panneau, demande de génération. | **Chargement à la demande réel** en amont du réseau et du rendu serveur, réutilisation des résultats valides. |
| **C — Nécessaire mais récurrente** | Donnée utile dont la fraîcheur exige une synchronisation : messages, notifications, statut de demandes, supervision et mises à jour visibles. | Chargement initial justifié puis rafraîchissement conditionné à visibilité, activité, changement ou événement. | Fréquence bornée, arrêt hors visibilité, cache, déduplication, Realtime si pertinent, push ou revalidation ciblée. |

Les catégories ne sont **ni des rôles d'accès**, ni une taxonomie de
confidentialité : une opération `privileged` peut être de catégorie A, B ou C.
Une même page peut cumuler les trois catégories. Un jeu de données peut changer
de catégorie selon son consommateur : les références de scores sont nécessaires
à une carte dont les couleurs sont visibles, mais facultatives sur un écran où
la carte n'est pas ouverte.

### 1.1 Règles de classement

1. **A par nécessité démontrée**, jamais parce qu'un `useEffect`, un hook SWR
   ou un Server Component est historiquement monté. L'absence d'une donnée
   essentielle ne doit pas provoquer de fausse valeur ou désactiver un contrôle
   de sécurité.
2. **B par défaut pour les enrichissements** : comparaison détaillée, historique
   secondaire, diagnostic administratif, export ou grande image. Le clic doit
   correspondre à une décision compréhensible, non à un obstacle artificiel.
3. **C uniquement si la fraîcheur a une valeur métier** : documenter pourquoi
   le simple rechargement volontaire ou un cache borné ne suffit pas.
4. **Ne pas ajouter un bouton déjà implicite** : ouvrir l'onglet « Communauté »,
   visiter `/sections/leaderboard`, soumettre une recherche ou générer un PDF
   sont déjà des intentions. Ajouter un deuxième bouton ne réduit pas
   nécessairement les requêtes et dégrade le parcours.
5. **Choisir au niveau de l'opération** : conserver automatiquement le résumé
   tout en différant les détails. Ne pas cacher toute la carte publique,
   toutes les informations d'une action ou le suivi personnel pour éviter une
   seule lecture facultative.
6. **Réévaluer lorsque le produit évolue** : les nouvelles surfaces, caches,
   sources, quotas ou usages peuvent modifier le bon déclencheur.

### 1.2 Ce que signifie « derrière un bouton »

La mise en attente doit empêcher **l'exécution** et pas seulement la visibilité :

- Avant l'intention : ni `fetch`, ni RPC Supabase, ni appel fournisseur, ni
  génération côté serveur déclenchés spécifiquement par le détail facultatif.
- Un panneau fermé ne doit pas monter un hook dont la clé SWR reste active.
  Utiliser une clé `null`, un `enabled` réel ou ne pas monter le composant.
- Une route serveur ne doit pas charger à l'avance une analyse facultative
  pour la masquer ensuite dans le navigateur.
- Les `prefetch`, `IntersectionObserver`, import dynamique, `Suspense` ou CSS
  seuls **ne garantissent pas** l'absence de requête. Vérifier le déclencheur
  réel de chaque dépendance, y compris les Server Components et liens Next.js.
- Après le clic : état `loading`, résultat, absence réelle, erreur et action de
  nouvelle tentative compréhensibles ; désactivation pendant la demande et
  déduplication des intentions simultanées.
- Lors d'une fermeture/réouverture : réutiliser les données encore valides,
  sans ajouter de cache parallèle.
- Au changement de paramètres métier : invalider les résultats incompatibles ;
  annuler ou ignorer les réponses tardives. Ne jamais montrer une ancienne
  prévision météo pour une nouvelle date ou un nouveau lieu.
- Un bouton « Actualiser » est distinct d'un bouton « Consulter » : il force
  une revalidation seulement à la demande, avec garde anti-abus adapté.

Pour une donnée de catégorie C, désactiver le polling quand la surface devient
inactive **sans perdre les événements qui doivent rester notifiés**. Un badge
d'alerte peut avoir une projection légère et un rythme limité tandis que son
historique détaillé attend l'ouverture du panneau.

### 1.3 Matrice de déclenchement par surface

| Situation | Comportement canonique |
|---|---|
| Arrivée sur une page | Charger son contenu essentiel A, pas les détails B de panneaux cachés. |
| Onglets mutuellement exclusifs | Charger seulement les données de l'onglet actif ; réutiliser le cache si l'utilisateur revient. |
| Modal, accordéon, panneau d'exploration | Ne déclencher B qu'après ouverture explicite ; préserver l'accessibilité clavier. |
| Carte principale et ses couleurs | Charger automatiquement les marqueurs et références nécessaires, bornés et cohérents. |
| Carte secondaire sous le pli | Différer ses données et dépendances jusqu'à son usage ou sa visibilité justifiée ; ne pas utiliser le viewport comme prétexte à un calcul caché non requis. |
| Recherche texte | Délai de frappe, longueur minimale, requêtes annulables, pagination ; éviter le clic de confirmation inutile si le parcours est une autocomplétion. |
| Temps réel et notifications | Visibilité, activité, déduplication et fréquence proportionnée ; ne pas supprimer les alertes. |
| Export PDF/CSV/JSON | Génération et lecture lourde après action explicite ; réutiliser snapshot et artefact existants. |
| Calcul local pur | Ne pas l'assimiler à un coût Supabase/Vercel ; prioriser les appels réseau et les ressources CPU réellement significatives. |
| Cron et opérations réglementaires | Exécuter indépendamment des visites ; bornes, idempotence et cadence contrôlées. |

## 2. Décisions produit par famille de fonctionnalités

Ces décisions encadrent les intégrations et leurs tests. Elles ne signifient
**pas** que les lots correspondants ont déjà été livrés. Le code publié reste
l'autorité sur le comportement effectivement disponible.

| Famille | Chargement à préserver | Déclenchement facultatif / optimisation retenue |
|---|---|---|
| **Gamification** | Progression et reconnaissance personnelles, sous AuthN. | Ne pas charger le classement public dans « Progression & badges » si un lien vers `/sections/leaderboard` existe déjà. Le chargement du classement appartient à cette page, après navigation volontaire. |
| **Recyclage** | Synthèse publique, informations pédagogiques et conseils de tri. | Ventilation authentifiée des déchets, qualité détaillée et grands agrégats au clic « Voir la répartition détaillée des déchets » ; aucune requête privée anonyme qui échoue systématiquement en 401. |
| **Communauté / Partenaires** | Événements dans l'onglet Communauté ; partenaires dans leur propre onglet. | Désactiver les lectures événements, RSVP et traitements annexes lorsque `?tab=partners` est actif. Le changement d'onglet est déjà le déclencheur ; aucun deuxième bouton. |
| **Annuaire** | Fiches, recherche et filtres publics permettant de trouver un acteur. | Différer seulement une carte ou des enrichissements qui causent de véritables lectures supplémentaires ; privilégier le filtrage local et le cache public existant. |
| **Administration Codex / Storage** | Alertes minimales nécessaires à la supervision, permissions et diagnostics de sécurité. | Monter les historiques et analyses détaillées uniquement avec « Consulter le suivi Codex » ou « Consulter l'utilisation du stockage » ; conserver les résultats lors d'une réduction/réouverture et garder l'actualisation manuelle distincte. Le seul chargement par proximité du viewport n'est pas une intention explicite. |
| **Pilotage institutionnel** | Vue générale et zone autorisée ; contrôles `canAccessPilotage` et scopes inchangés. | Suspendre la cadence périodique lorsque l'onglet « Méthodologie » est actif, réutiliser le snapshot SWR valide au retour dans les onglets de données et ouvrir les opérations ou comparaisons avancées sur demande. |
| **Rapports d'impact** | Synthèse exacte admissible, onglets « Mes fichiers » et bibliothèque selon leurs contrats d'accès. | Analyses profondes après « Afficher les analyses détaillées » ; préserver la reprise de configuration, les filtres et le générateur existant. Aucun deuxième bouton avant `POST /api/reports/generations`, déjà explicite. |
| **Cartographie** | Marqueurs, couleurs et références indispensables à la carte principale ; exclusions des actions privées. | Références de score et modules Leaflet des cartes secondaires seulement quand réellement nécessaires ; déduplication par contexte/viewport, pas de RPC par popup. |
| **Galerie SPOGOMI** | Miniatures et crédits publics, parcours clavier. | Grande résolution uniquement après ouverture de la photo ; mesurer le poids réel et préférer une variante canonique légère si son économie nette est justifiée. |
| **Checklist bénévole / météo** | Équipements fournis, matériel à apporter et conseils Waste sans météo. | Prévision fraîche et recommandations météo après « Voir les recommandations selon la météo » ; préférer un contexte déjà valide. Ne pas masquer un calcul local léger ni appeler Open-Meteo avant intention pour cette checklist. |
| **Itinéraires** | Formulaire et données utiles au paramétrage. | `POST /api/route/recommend` est déjà une action explicite : ne pas ajouter une confirmation secondaire ; optimiser la résolution serveur et le cache si les mesures l'exigent. |
| **Messagerie / notifications** | Messages de la conversation ouverte, alertes et compteur nécessaire à l'utilisateur. | Pas de bouton préalable ; polling borné et désactivé hors contexte, Realtime si utile, historique et listes détaillées différés si indépendants du compteur. |
| **Adresses** | Suggestions pendant une véritable saisie. | Garder un debounce, seuil minimal, local-first et annulation des recherches périmées ; ne pas remplacer l'autocomplétion par un bouton. |
| **Accueil** | Contenu public essentiel et synthèse légère. | ISR et rafraîchissement de l'activité proche du viewport selon son contrat ; aucune obligation de cliquer pour comprendre CleanMyMap. |
| **Maintenance** | Crons, rappels et obligations opérationnelles. | Pas de dépendance au clic ; fréquence, scope, quotas de traitement et idempotence contrôlés. |

### 2.1 Précautions métier propres à ces décisions

- **Résumé et détail doivent provenir du même modèle métier canonique.** Ne
  jamais fabriquer un compteur global à partir d'un échantillon tronqué ni
  substituer un agrégat public à un scope d'organisateur.
- **La météo externe doit être distinguée du coût hébergeur.** Un appel direct
  navigateur → Open-Meteo n'est pas en soi une invocation Vercel ni une lecture
  Supabase ; une route serveur qui agrège météo et actions peut consommer les
  deux. Les règles de fraîcheur, de pertinence et de fournisseur restent
  applicables dans les deux cas.
- **Le classement ne doit pas émettre de nouvelle récompense.** Son chargement
  différé ne change ni le ledger XP, ni les règles de consentement ou de
  visibilité publique.
- **Les exports ne créent pas une nouvelle vérité.** Prévisualisation, document
  HTML officiel, PDF et snapshots historiques restent synchronisés via leurs
  contrats de génération et de stockage existants.
- **Les scores de la carte ne sont pas décoratifs.** Une carte principale ne
  doit pas devenir grise, afficher zéro ou changer de légende à cause d'une
  optimisation qui supprime les références nécessaires.
- **Les actions privées restent privées**, y compris lors d'un appel direct à
  une API, d'un préchargement, d'un export ou d'une requête par `actionId`.
- **Les données inconnues restent inconnues** : erreur, absence de permission,
  couverture partielle ou cache périmé ne se transforment jamais en zéro ni en
  « aucune activité ».

## 3. Placement technique et nature des quotas

Choisir la couche portant effectivement la responsabilité :

| Besoin | Couche par défaut | Règle |
|---|---|---|
| Contenu public durable et versionné | Git / rendu statique | Pas de base sans nécessité de mutation. |
| État personnel éphémère non critique | Navigateur | `localStorage` / IndexedDB si aucune synchronisation nécessaire. |
| Donnée métier partagée, persistée ou sécurisée | Supabase | RLS, index, projection minimale et requêtes bornées. |
| Secret, privilège, coordination interservices | Serveur/Vercel | Handler justifié, limité et mesurable. |
| Média ou livrable réutilisable | Asset préparé, Storage ou CDN | Éviter de reconstruire à chaque consultation. |
| Donnée dérivée et recalculable | Cache, ISR, revalidation ou snapshot | Le cache n'est jamais source de vérité. |

Une route Vercel n'est pas un relais Supabase par défaut. Un accès direct du
navigateur à Supabase n'est acceptable qu'avec un contrat RLS et une projection
réellement adaptés. Aucune optimisation ne doit exposer une clé privilégiée.

### 3.1 Coûts à distinguer

**Vercel** : `Invocations`, `Edge Requests`, `Fast Origin Transfer`,
`Fast Data Transfer`, mémoire et calcul des fonctions, builds et déploiements.
Un rendu serveur ou une API peut également réaliser plusieurs lectures en base.
Les noms commerciaux peuvent évoluer ; les tableaux de bord du fournisseur
restent la référence des compteurs réels.

**Supabase** : ressources PostgreSQL (requêtes, durée et contention), egress
Database/Storage, taille et nombre des objets Storage, trafic Realtime,
connexions, fonctions éventuelles et opérations administratives. Une lecture
directe Supabase peut ne pas appeler Vercel tout en consommant la base et le
réseau. Inversement, une fonction Vercel qui ne lit pas Supabase consomme des
ressources Vercel, pas nécessairement un quota Database.

**Autres services** : Clerk, Open-Meteo, géocodage, email, Sentry, PostHog,
GitHub et autres fournisseurs disposent de tarifs, politiques et limites
indépendants. Une opération client directe vers un tiers ne doit pas être
comptée comme une invocation Vercel fictive.

Pour toute hypothèse d'économie, définir l'unité : requêtes **logiques**
évitées, invocations observées, lignes/objets lus, octets transférés, CPU,
événements Realtime, transformations ou téléchargements. Ne pas convertir
un compteur local en euros ou en pourcentage d'allocation sans métriques
correspondantes et tarifs applicables vérifiés.

### 3.2 Instrumentation et comparabilité

Pour chaque opération significative, relever si accessible :

1. **Déclencheur réel** : montage, navigation, clic, onglet, scroll, focus,
   mutation, timer, cron, bot ou revalidation.
2. **Chaîne d'appels** : navigateur → route Vercel → RPC/SQL/Storage/tiers ;
   différencier accès direct Supabase et passage par fonction.
3. **Cardinalité** : appels par visite, utilisateur, événement, fenêtre horaire
   et scénario de montée en charge.
4. **Volume et coût unitaire** : octets, lignes, taille de payload, durée,
   cache hit/miss, génération d'artefact ou trafic de médias.
5. **Comparaison juste** : même action utilisateur, audience, cold/warm cache,
   droits et période. Les changements de trafic ne valent pas gains d'efficacité.
6. **Niveau de preuve** : observation fournisseur, trace réseau ou test local,
   estimation modélisée et simple hypothèse explicitement distingués.

Si les données de facturation ou les logs sont indisponibles, conserver un
**verdict de coût non mesuré**. Des tests montrant zéro requête facultative
avant clic démontrent un déclenchement maîtrisé, **pas** un montant économisé.

## 4. Soutenabilité préventive des offres gratuites

CleanMyMap doit pouvoir rester sur les offres gratuites de Vercel, Supabase et
des services associés aussi longtemps que raisonnablement possible, même si
les bénévoles, actions et consultations augmentent fortement. Les quotas sont
une contrainte d'architecture dès la conception et non un problème à attendre.

Réévaluer en priorité lorsqu'au moins une condition apparaît :

- Une page, fonctionnalité, famille de requêtes, tâche automatique ou ressource
  représente **plus de 50 % d'un quota observé**, même si l'offre n'est pas
  globalement proche de sa limite.
- Une fonctionnalité consomme ou pourrait consommer une part majeure de
  l'allocation gratuite dans un scénario crédible.
- La croissance prévue pourrait saturer un quota : utilisateurs, actions,
  fréquence, volume de preuves, photos ou exports.
- Une consommation élevée survient sans utilisateurs actifs : robots,
  monitoring, polling, cron, déploiements, revalidations ou previews.

L'examen doit :

1. mesurer les causes : appels, octets, exécutions, cache, coûts fixes et
   unitaires, sans confondre observation, estimation et hypothèse ;
2. modéliser plusieurs scénarios de croissance, sans supposer une relation
   systématiquement linéaire ;
3. comparer suppression de redondance, statification, chargement conditionnel,
   cache, revalidation, pagination, agrégats, traitement différé, simplification,
   choix de fournisseur ou arbitrage fonctionnel ;
4. rendre explicite toute décision de simplifier, restreindre, remplacer,
   différer ou retirer une fonctionnalité coûteuse si sa valeur est insuffisante ;
5. rechercher une baisse **structurelle du coût par visite ou action**, et non
   une amélioration cosmétique d'un dashboard ;
6. revalider avec tests, audits et mesures disponibles avant une ouverture
   plus large au public.

Une fonctionnalité dominante n'est pas automatiquement supprimée ; sa
justification et sa soutenabilité doivent néanmoins être démontrées. Une faible
consommation courante ou un faible nombre d'utilisateurs ne prouve pas la
soutenabilité future.

## 5. Arbre de décision avant toute fonctionnalité

1. **Quelle valeur immédiate ?** Classer chaque opération en A, B ou C.
   Décider du déclencheur et de la fraîcheur métier, pas de l'UI seulement.
2. **La donnée doit-elle être persistée ?** Sinon préférer Git, calcul pur
   local ou état navigateur selon sa nature.
3. **Doit-elle être partagée, sécurisée ou synchronisée entre appareils ?**
   Supabase est candidat si oui ; état local autrement, sans contourner le
   besoin réel de cohérence.
4. **Exige-t-elle un secret, une AuthZ serveur, une mutation privilégiée ou une
   agrégation non exposable au client ?** Utiliser alors le serveur/Vercel,
   avec une frontière clairement justifiée.
5. **Quel volume réellement nécessaire ?** Projeter les colonnes, les filtres
   et le périmètre, puis appliquer limite, pagination, bbox ou agrégat.
6. **Quelle fraîcheur est requise ?** Statique, ISR, cache court, ETag,
   revalidation métier, polling visible, événement ou temps réel.
7. **Le déclenchement évite-t-il réellement le réseau ?** Vérifier les montages
   SWR, le rendu serveur, les prefetchs Next.js et les fallback loaders.
8. **Des calculs ou objets existent-ils déjà ?** Réutiliser snapshot, cache,
   RPC, service et artefact canonique avant toute nouvelle abstraction.
9. **Quelles protections ?** AuthN, AuthZ, RLS, scopes, rate limit, bot/abus,
   taille de réponse, identité du cache et protection des actions privées.
10. **Quelle preuve ?** Tests réseau avant/après intention, tests de contrats,
    mesure en production si possible et STOP CONDITION explicite.

## 6. Vercel : contrats durables

### 6.1 Déploiement, validation et rétention

La signature d'un commit Git est un signal d'intégrité, pas une demande de
build/déploiement. La configuration versionnée `apps/web/vercel.json` désactive
les déploiements Git automatiques (`git.deploymentEnabled: false`). Tout
Preview ou Production doit être explicitement autorisé selon les gates
`FULL` puis `RELEASE` sur le **SHA exact**. Un push Git n'est pas une preuve
de déploiement ni de disponibilité de la nouvelle fonctionnalité.

Historique à ne pas réactiver tacitement : du **10 au 16 septembre 2026 inclus**,
un moratoire interdisait tout deployment Preview/Production, promotion ou Deploy
Hook, ainsi que tout push pouvant déclencher un déploiement automatique. Il
interdisait les contournements (`--force`, `--no-verify`, CLI ou workflow
alternatif). Il a expiré le **16 septembre 2026** ; la reprise à partir du
17 septembre exigeait et exige toujours une autorisation volontaire conforme
à la gouvernance de release. Ce moratoire n'est **pas** une interdiction active
après son échéance.

Mesurer périodiquement, lorsque les données existent : commits intégrés à
`main`, Productions réelles, SHAs associés, ratio `Productions / commits main`
et nombre de Productions par commit. Séparer Production, Preview, `canceled`
et `error`. Les lectures API sont sans effet sur la permission de déployer.

Limiter la rétention des Previews, déploiements annulés et erreurs, puis des
Productions excédentaires, selon les réglages effectifs de l'équipe Vercel.
Une recommandation documentaire n'est pas la preuve qu'un réglage fournisseur
est actif.

### 6.2 Configuration versionnée vérifiable

Le dépôt documente `apps/web/vercel.json` et `.vercel/project.json` comme
configuration du projet :

- `rootDirectory` : `apps/web` ; région des fonctions : `cdg1` ;
- auto-déploiement Git désactivé par `deploymentEnabled=false` ;
- unique cron Vercel déclaré : `/api/cron/maintenance`, `20 3 * * *` UTC,
  le registre applicatif décidant ensuite quels jobs sont dus ;
- source maps : `NEXT_PUBLIC_SOURCE_MAP=true`,
  `productionBrowserSourceMaps: true`, `experimental.serverSourceMaps`
  désactivé ; upload de symbolication via
  `scripts/upload-sentry-sourcemaps.mjs`, puis suppression des `.map` du
  filesystem de build après la tentative d'upload.

Toute référence à cette configuration doit être recontrôlée sur le `main`
courant et dans Vercel avant une décision opérationnelle.

La page d'accueil exporte `revalidate = 3600`. L'activité communautaire a son
propre cache et ne doit pas être confondue avec la revalidation ISR de la page.

### 6.3 Rendu dynamique et caches

Ne pas employer par défaut :

```txt
force-dynamic
revalidate = 0
cache: "no-store"
```

Ces mécanismes restent indispensables dans certains flux privés ou sensibles.
Les justifier par le contrat de fraîcheur ou de sécurité, et non par facilité.
Préférer le statique pour le contenu durable, ISR pour une fenêtre de fraîcheur,
un cache partagé **uniquement pour les données véritablement publiques**, et
un cache privé adapté pour les données de session. Une clé publique ne doit
jamais incorporer un `userId`, une préférence sensible, une géolocalisation
précise ou un résultat privilégié.

#### Inventaire des caches existants à respecter

Les limites de lignes et les TTL ci-dessous correspondent aux **contrats
documentés dans le dépôt**, non à des octets mesurés ou à des plafonds de
facturation. Vérifier l'implémentation CURRENT avant de modifier une entrée.

| Surface | Clés et cardinalité | Borne contractuelle | TTL | Invalidation / usage |
|---|---|---|---|---|
| Accueil | ISR de page, clé de route | page et activité bornée | 3600 s | rendu accueil, activité indépendante |
| Activité accueil | clé de route | liste d'activité bornée | 600 s | `/api/homepage/activity` |
| Méthodologie | ISR de page, clé de route | snapshot et GitHub bornés | 86400 s | `/methodologie` |
| Statistiques GitHub | URL de dépôt / endpoint | pagination bornée | 3600 s par défaut ; 86400 s en méthodologie | cache `fetch` Next |
| Actions unifiées | `limit/status/floor/coords/types` | jusqu'à 1500 contrats / lecture | 600 s | `unified-action-contracts`, invalidation après action |
| Pilotage | `period/limit/types` et scope | borne propre au caller (notamment 1800 pour `/pilotage` dans le code relu) | 600 s | `pilotage-overview` |
| Événements communautaires | `limit` ; `eventId` hors Data Cache | limite du loader | 900 s | invalidation événement/RSVP |
| Événements rapports | `limit` de 1 à 120 | 120 événements et compteurs RSVP | 900 s | rapports |
| Pression événements — itinéraire | snapshot unique | 560 événements + 4000 RSVP | 900 s | planification |
| Pression par arrondissement | snapshot unique | 280 événements + 4000 RSVP | 900 s | planification |
| Spots | `limit` de 1 à 300 × statut | au plus 300 spots / lecture | 60 s | `spots-map` |
| Classement gamification | 2 scopes × 3 métriques | classement borné | 120 s | tag classement |
| Labels progression | clé partagée | au plus 10000 lignes d'actions | 120 s | tag commun |
| Export referrals administrateur | clé sans dimension utilisateur | pagination par lots de 1000, volume total évolutif | 600 s | tag `admin-referral-lineage-export` |

Les invalidations métier utilisent `revalidateTag(..., "max")` lorsque
c'est le contrat CURRENT. Elles marquent les entrées périmées ; elles ne doivent
pas fabriquer une entrée supplémentaire par utilisateur. Les événements
invalident flux communautaire, rapports et pression d'itinéraire ; les actions
invalident les contrats unifiés et les snapshots applicables.

Les lectures à forte cardinalité — recherche textuelle de comptes, paramètres
de localisation précise, préremplissage, nom d'affichage, progression privée,
referrals, etc. — ne sont pas promues sans preuve dans le Data Cache partagé.
Elles peuvent utiliser des réponses privées et des caches de session adaptés.

### 6.4 Routes API : responsabilité, bornes et déclenchement

Une route applicative doit apporter une responsabilité réelle : mutation métier,
AuthZ serveur, secret, validation/anti-abus, agrégation nécessaire, orchestration
ou livrable serveur justifié. Éviter les handlers ne faisant que relayer une
lecture Supabase démontrée `RLS-safe`.

Pour toute liste, dashboard ou export, imposer une borne : pagination, `limit`,
période, scope, bbox, agrégat ou contrat équivalent. Éviter une chaîne
`composant → API → Supabase` au montage de chaque sous-panneau si la même
projection est déjà disponible et admissible dans le cache.

Les routes privées restent protégées **côté serveur** même lorsque leur panneau
est masqué : l'existence d'un bouton ne constitue jamais une AuthZ.

Cas documentés de coût et d'autorisation à préserver :

- `GET /api/actions/account-options` : sélecteur authentifié de comptes Clerk,
  pages de 10 comptes, recherche bornée à 120 caractères, offset maximal de
  100000, limiteur à 60 requêtes/minute. Projection minimale (`id`, nom public,
  pseudo), réponse `private, no-store`, aucune donnée privée Clerk exposée.
  Coût : invocation Vercel + accès Clerk ; charger lors de l'ouverture du
  sélecteur ou d'une recherche pertinente, pas au montage du formulaire entier.
- `GET/PATCH /api/actions/invitations` : uniquement le destinataire
  authentifié d'une invitation `manual_add`, lecture/décision via RPC
  destinataire-scopées, réponse personnelle `private, no-store`, données
  minimales et mutation atomique/idempotente. Lectures bornées à 30/minute,
  décisions à 10/minute selon la politique du service.
- `GET /api/actions/registration-requests` : reviewers authentifiés, RPC
  bornée aux demandes `group_form/pending` d'actions futures publiées et
  visibles, sans nouvelle file ni payload privé inutile. État personnel
  `private, no-store`.

Les lectures de décisions sont alimentées par la cloche de notifications ; la
cloche ouverte se rafraîchit au plus selon l'intervalle contractuel de
**300 secondes**, la cloche fermée et la page visible à **900 secondes**.
Le tableau de bord charge à son ouverture et lors d'une action explicite, sans
intervalle propre. Ces valeurs doivent être recontrôlées dans le code lors
d'une modification ; ne pas les durcir ou raccourcir sans justification.

### 6.5 Edge, proxy et préchargements

Le proxy ou middleware couvre uniquement les frontières qui le nécessitent.
Ne pas élargir son matcher pour dupliquer une AuthZ correctement appliquée
par le handler. Ne pas affaiblir la validation en déplaçant simplement une
opération hors du proxy.

Les liens vers un détail B ou une route protégée ne doivent pas déclencher
involontairement un prefetch coûteux. Pour un lien Next.js vers une analyse
lourde, désactiver le prefetch lorsque nécessaire, en vérifiant le comportement
réel ; ne pas supprimer la navigation directe légitime.

### 6.6 SWR, polling, Realtime et interfaces live

Pour une lecture de catégorie B, utiliser une **clé SWR inactive avant
l'intention** ou le montage conditionnel du hook. Après ouverture, réutiliser
le cache, les règles de déduplication et `swrRecentViewOptions` déjà en place.
Ne pas ajouter une option globale qui modifie silencieusement la fraîcheur de
toutes les surfaces.

Tout polling de catégorie C doit avoir :

- un propriétaire métier et une raison de fraîcheur identifiée ;
- une fréquence documentée et proportionnée ;
- une condition de session, d'activité, de visibilité ou d'onglet ;
- un arrêt ou ralentissement lorsque la page est masquée, hors ligne ou que
  la surface n'est pas consultée ;
- une déduplication des appels simultanés, et une stratégie de reprise ;
- une comparaison explicite avec Realtime, push, revalidation ciblée ou cache.

Ne pas installer Realtime pour une donnée qui tolère un cache court. Ne pas
forcer un clic périodique pour recevoir des messages ou alertes importantes.
Séparer un **compteur léger** d'un historique détaillé lorsque le contrat le
permet sans introduire une seconde vérité ni un délai de décision dangereux.

### 6.7 Server Components et données de grande taille

Conserver un Server Component lorsqu'il correspond au contrat de la page ;
isoler l'interaction dans le sous-arbre client le plus petit. Ne pas convertir
une page entière en Client Component pour déplacer un `fetch` qui reste
nécessaire côté serveur. Un bouton n'économise rien si le Server Component a
déjà exécuté `loadReportsAnalysisData()` ou une agrégation équivalente avant
l'affichage du bouton.

Préférer un **résumé léger canonique** et une route ou un état de navigation
explicitement demandé pour le détail. Une sous-page dédiée, un paramètre
`detail=1` ou un Server Action/handler existant peut être adéquat selon son
contrat ; vérifier les prefetchs et les frontières d'accès. Éviter le
transport/hydratation d'objets complets lorsque seule une synthèse sert l'UI.

Les contrats de pilotage, de rapports et de filtres doivent partager leur
logique canonique : le résumé ne peut ni élargir les scopes, ni présenter une
couverture tronquée comme exhaustive.

### 6.8 Cartographie

Les dépendances cartographiques lourdes (Leaflet, clustering, dessin, routing)
restent isolées côté client et ne sont chargées que lorsque pertinentes. Les
requêtes de carte sont bornées par viewport, filtres, période, limite ou
agrégat ; jamais une table entière pour obtenir quelques marqueurs.

- Une carte **principale** charge automatiquement les données et références
  requises pour les scores et leurs couleurs correctes.
- Une carte **secondaire** peut différer ses données jusqu'à son ouverture ou
  sa visibilité utile, sans déclencher des calculs cachés par simple montage.
- Les paramètres identiques réutilisent les réponses admissibles ; une réponse
  tardive d'un ancien viewport ne doit pas écraser la carte courante.
- Éviter une requête de score par popup. Réutiliser la projection publique
  unique, les références globales et la source canonique des couleurs.
- Préserver strictement le filtrage des actions privées et la compatibilité
  des contrats `/api/actions/map` et `actions_map_feed`. Ne pas changer
  de source pour économiser un appel sans parité de DTO prouvée.

### 6.9 Images, médias et Storage

Préférer compression avant upload, dimensions préparées et variantes adaptées
aux affichages. Les assets statiques versionnés restent dans Git/CDN ; les
médias métier persistants dans Storage/CDN selon leur contrat.

- Une miniature ne devrait pas télécharger le fichier haute résolution si une
  variante légère existe et si son coût total est meilleur.
- Ouvrir une photo en plein écran est une intention permettant le téléchargement
  de la variante HD ; conserver le chargement différé et l'accessibilité.
- Ne pas multiplier transformations dynamiques ou dérivés persistants sans
  comparer CPU, stockage supplémentaire, maintenance et octets épargnés.
- URL signées, droits Storage, crédit, consentement et révocation restent
  conformes aux contrats métier. Le cache public ne doit jamais rendre un
  fichier privé accessible après la perte de ses droits.

### 6.10 PDF, CSV/JSON et artefacts réutilisables

Pour tout livrable lourd :

1. borner et vérifier les données sources ;
2. vérifier scope et AuthZ ;
3. réutiliser snapshot, HTML canonique et artefact préparé lorsqu'ils existent ;
4. générer côté navigateur si le contrat le permet sans altérer la preuve ;
5. utiliser Storage lorsque le même fichier est réutilisable ;
6. réserver la génération serveur aux cas qui en ont réellement besoin.

Le quota applicatif, les réservations atomiques, la composition officielle et
l'historique des rapports restent inchangés par une optimisation de
préchargement. Une consultation ou un téléchargement historique ne doit pas
consommer un nouveau quota de génération si le contrat actuel l'exclut.

### 6.11 Crons, rappels, bots et analytics

Les coûts sans visite humaine peuvent venir de cron, monitoring, previewers,
robots, revalidations, polling abandonné ou déploiements. Identifier le chemin
réel avant de modifier l'application. Ne pas créer un cron par fonctionnalité
si le registre `/api/cron/maintenance` peut l'exécuter correctement.

Le rappel J-1 des inscriptions confirmées utilise le job quotidien
`action-reminders` dans le registre existant. La RPC cible le lendemain en
`Europe/Paris`, les inscriptions `confirmed` et les préférences de rappel ;
les identifiants d'événements stables rendent les retries idempotents et
empêchent la réémission indue après changement de date. La préférence en
réglages reste une lecture personnelle limitée, sans canal email/SMS/push
implicite ajouté pour réduire ou déplacer le coût.

Les analytics soumises au consentement ne doivent pas démarrer avant la
préférence applicable. Conserver le batching et le throttling de pageviews ;
réévaluer la granularité des événements si le volume dépasse la valeur de
l'analyse. Le suivi des coûts ne doit pas nécessiter davantage de télémétrie
que ce qu'il cherche à économiser.

## 7. Supabase : requêtes, Storage et Realtime

Les méthodes de tuning SQL, index et plans d'exécution sont canoniques dans
[`../database/supabase-table-optimization-playbook.md`](../database/supabase-table-optimization-playbook.md).

Règles transversales :

- aucun `SELECT *` ou chargement de table entière par commodité ;
- projection minimale, limite et pagination documentées ;
- filtres et scopes appliqués **en base** avant lecture, plutôt qu'en JavaScript
  après transfert d'un corpus inutile ;
- index adaptés aux prédicats et ordres utilisés par les vrais consommateurs ;
- RPC ou agrégation partagée lorsqu'elle supprime des scans répétitifs tout en
  préservant les permissions et la qualité des données ;
- snapshot ou cache court pour les synthèses ne nécessitant pas le temps réel ;
- pas de duplication de tables, services, registries ou ledgers pour simplifier
  temporairement une interface ;
- jamais de désactivation ou d'assouplissement RLS sous prétexte de coût ;
- jamais de lecture publique d'un contenu privé en raison d'un cache partagé ;
- Storage : réutiliser les objets, réduire la taille des images, vérifier la
  politique de rétention et ne pas régénérer des PDFs identiques ;
- Realtime : s'abonner aux événements utiles et nettoyer les abonnements des
  surfaces inactives ; ne pas diffuser des datasets complets sans raison.

Une table centrale peut rester visible dans les audits si ses accès sont
légitimes, indexés, bornés et nécessaires. « Zéro requête Supabase » ne
constitue pas un objectif métier absolu.

## 8. Coût, sécurité et autorisation

Ne pas créer une taxonomie de sécurité fondée sur le coût. Les classes
canoniques relèvent de
[`../security/authorization-capabilities.md`](../security/authorization-capabilities.md) :

```txt
public_read
authenticated_write
private_read
privileged
public_write_exception
```

Une surface peut être `privileged` si la fonctionnalité et son risque le
justifient, mais pas uniquement parce qu'elle est coûteuse. Un bouton ou un
onglet masqué ne remplace jamais :

- authentification, ownership, scope et AuthZ côté handler/RPC ;
- RLS PostgreSQL et vérification de l'audience ;
- validation des entrées et limites anti-abus ;
- projection allowlistée et absence de données internes ;
- isolation des caches et invalidation lorsque les droits changent ;
- idempotence, transactions ou réservation atomique des mutations ;
- non-divulgation des actions privées, rapports privés et ressources Storage.

Les opérations confidentielles ou changeantes peuvent imposer `private,
no-store` même si cela coûte plus cher. La sécurité prime sur la réutilisation
d'un cache public.

## 9. Tests et critères de preuve

### 9.1 Contrat minimal pour une fonctionnalité B

Avant de classer un chargement « à la demande » comme terminé, démontrer :

1. **Sans clic / onglet inactif** : aucune requête dédiée à l'enrichissement B,
   y compris côté serveur, dans les hooks enfants et à cause du prefetch.
2. **Intention explicite** : réponse conforme, chargement perceptible et
   contrôles d'accès conservés.
3. **Double activation** : requête logique dédupliquée ; pas d'opérations
   privilégiées concurrentes ou de génération multiple.
4. **Retour** : réutilisation d'un résultat encore frais et compatible.
5. **Contexte modifié** : date, période, scope, coordonnées ou filtres
   invalident exactement les réponses incompatibles ; pas d'affichage obsolète.
6. **Erreur / hors horizon / absence de droits** : état explicite ; aucune
   valeur métier fabriquée, repli dangereux ou 401 anonyme systématique.
7. **Parcours alternatifs** : deep-links, mobile, export, impression, reprise
   d'historique et interactions clavier ne déclenchent rien d'inattendu.
8. **Sécurité** : appeler directement l'endpoint ne contourne pas les
   protections assurées par l'UI.

Les tests doivent compter les appels réseau/clients Supabase mockés et
instrumenter le déclenchement côté serveur si pertinent, pas uniquement
vérifier que le bouton est présent ou qu'un composant est caché. Un test de
présentation ne prouve jamais RLS, concurrence ou AuthZ réelle : respecter les
niveaux de validation du dépôt.

### 9.2 Contrat minimal pour A et C

- **A** : premier rendu utile, données essentielles correctes, autorisation
  avant exposition, sérialisation bornée, cache sûr et absence d'appel dupliqué.
- **C** : cadence maîtrisée, arrêt quand la surface n'est plus pertinente,
  reprise correcte, événements non perdus, observabilité proportionnée, et
  pas de polling simultané redondant entre composants.
- **Toutes** : états `loading`, `empty`, `unavailable`, `error` clairement
  distingués ; absence de fuite dans des réponses publiques et tests de
  non-régression des parcours essentiels.

### 9.3 Preuves et résultats attendus

Chaque modification documente au minimum :

- le **type A/B/C**, la décision produit et les appels concernés ;
- le nombre de requêtes **logiques** avant/après dans les scénarios testés ;
- le fonctionnement des caches, la fraîcheur et l'invalidation ;
- le gain fournisseur réellement mesuré, **ou explicitement non mesuré** ;
- les tests exécutés, limites et anomalies sans transformer un mock en preuve
  PostgreSQL, Clerk, navigateur réel ou production ;
- le SHA vérifié et la convergence publiée suivant la gouvernance Git.

Ne pas ajouter un nouveau service d'analytics payant pour démontrer une
réduction qui peut être testée au niveau du déclencheur.

## 10. Checklist de modification

Avant publication d'une fonctionnalité touchant aux coûts plateforme :

- [ ] Chaque opération distante a une classification A/B/C et un déclencheur justifié.
- [ ] Les données essentielles restent disponibles sans clic artificiel.
- [ ] Aucun chargement B masqué n'exécute de requête anticipée sur client, serveur ou prefetch.
- [ ] Les onglets et panneaux non actifs ne chargent que les données réellement partagées.
- [ ] Les pollings C ont visibilité, fréquence, arrêt et déduplication documentés.
- [ ] La couche de placement, l'owner métier et la source canonique sont conservés.
- [ ] Aucune route Vercel de relais inutile ni seconde source de vérité n'est créée.
- [ ] Chaque lecture croissante est bornée, filtrée et projetée au minimum.
- [ ] Le cache, la clé, le scope, la fraîcheur et l'invalidation sont explicités.
- [ ] Les données privées ne sont ni mises en cache publiquement ni chargées par prétexte UX.
- [ ] Les exports et médias lourds réutilisent, lorsque possible, un artefact adapté.
- [ ] Les crons, analytics et ressources sans visiteurs restent surveillés.
- [ ] Les permissions, RLS, validations et limites de débit restent intactes.
- [ ] La taille du bundle est revue pour toute dépendance cartographique ou visuelle lourde.
- [ ] Le quota potentiel (Vercel, Supabase ou tiers) est identifiable sans confondre leurs unités.
- [ ] Les consommations >50 % d'un quota observé ou potentiellement dominantes sont réévaluées.
- [ ] Les coûts fixes et plusieurs scénarios de croissance sont étudiés avant élargissement.
- [ ] Les tests réseau prouvent l'absence des appels facultatifs avant intention.
- [ ] Les gains estimés, mesurés et non mesurés sont explicitement distingués.
- [ ] Les tests/checks requis sont exécutés et leur niveau de preuve est rapporté.

## 11. Audits, commandes et références

Commandes existantes de contrôle :

```bash
npm run audit:vercel-quota
npm run audit:vercel:ci
npm run report:vercel-surface
```

`npm run report:vercel-surface` produit son résultat courant sous
`artifacts/vercel/`. Un artefact généré n'est pas une source documentaire
`CURRENT`. Les audits historiques sont indexés par
[`audits/README.md`](./audits/README.md). Une mise à jour volontaire d'une
baseline doit correspondre à un changement réel du runtime et être validée
par les scripts existants, non servir à masquer un dépassement.

Références spécialisées :

- [Gouvernance des données](../architecture/data-governance.md)
- [Documentation Database](../database/README.md)
- [Playbook d'optimisation Supabase](../database/supabase-table-optimization-playbook.md)
- [Capacités d'autorisation](../security/authorization-capabilities.md)
- [Client/server bundle splitting](../development/client-server-bundle-splitting.md)
- [Testing](../development/TESTING.md)
- [Résolution des builds Vercel](./vercel-build-troubleshooting.md)
- [Index des audits historiques](./audits/README.md)

**Décision de gouvernance documentaire :** les politiques A/B/C, les
principes de déclenchement et les bonnes pratiques restent dans **ce fichier
unique**. Les métriques datées, classements, exemples de traces réseau et
résultats d'intégration vivent dans les audits et rapports existants. Ne pas
créer une deuxième « gouvernance des coûts » en parallèle.
