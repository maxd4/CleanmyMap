# Stratégie de répartition Vercel, Supabase et navigateur

Dernière mise à jour: 2026-06-27

Objectif: réduire fortement le risque Vercel sans tout déporter aveuglément, et distinguer clairement ce qui est déjà au bon endroit de ce qui doit encore être migré proprement.

La règle de base pour CleanMyMap est simple:
- Vercel sert l'interface et l'orchestration légère,
- Supabase gère les données et les agrégations persistantes,
- le navigateur garde l'état personnel, éphémère ou non critique.

Cette répartition limite les `Invocations`, les `Edge Requests` et le transfert origine, tout en gardant la logique métier au bon endroit.

## Tableau de placement rapide

| Fonction | Statut | À mettre où | Pourquoi |
| --- | --- | --- | --- |
| Réponses fausses aux quiz | Déjà au bon endroit | `localStorage` / `IndexedDB` | Pas besoin de Supabase ni de Vercel |
| Préférences d'affichage, calques carte, légendes ouvertes | Déjà au bon endroit | navigateur | Évite des écritures inutiles |
| Brouillons de formulaire | Déjà au bon endroit | navigateur | Évite l'auto-save serveur |
| Documents `.md` open source | Déjà au bon endroit | repo Git / pages statiques | Pas besoin de base de données |
| Compteurs, scores, badges | Partiellement migré: les compteurs utilisateur passent déjà en direct côté navigateur; le reste doit rester borné ou migrer proprement | RPC Supabase ou agrégats persistés | Évite de recalculer à chaque visite |
| Images utilisateurs, rapports PDF générés | À migrer proprement si traités à la volée | Supabase Storage / assets préparés | Évite Vercel Blob ou des fonctions serveur longues |
| Carte dynamique | Déjà au bon endroit | client → Supabase RPC filtré | Évite une API Vercel intermédiaire |
| Génération de PDF | À migrer proprement si le flux est récurrent et coûteux | navigateur si possible, sinon traitement serveur dédié | Évite les fonctions Vercel longues |
| Analytics et pageviews | Déjà au bon endroit si le consentement bloque réellement le chargement | navigateur après consentement | Évite de charger PostHog ou les trackers avant accord |
| Cartes Leaflet lourdes | Déjà au bon endroit | navigateur quand la zone devient visible | Évite de charger le chunk carto sur les vues où il n'est pas encore utile |

Notes d'application:
- si les réponses de quiz sont personnelles mais non sensibles, le navigateur reste le meilleur choix;
- si une carte a besoin d'une sécurité forte ou d'une logique métier complexe, garder le serveur Vercel entre le client et Supabase peut rester justifié;
- si la carte n'est qu'un relais de lecture Supabase, le navigateur doit appeler le RPC filtré directement;
- si un PDF doit être signé, archivé ou contrôlé, le navigateur n'est acceptable que si le flux reste simple et non critique.
- si l'analytics n'est pas consentie, ne pas charger le tracker ni le client PostHog;
- si une carte n'est pas encore dans la zone visible, ne pas déclencher son chunk Leaflet avant le scroll utile.
- quand un cas est marqué `À migrer proprement`, il faut une migration versionnée, des usages côté client ou serveur adaptés, puis une validation ciblée, pas un simple déplacement de code.
- les compteurs utilisateur peuvent être lus directement côté navigateur via Supabase avec RLS; les anciennes routes Vercel de simple lecture n'ont plus à rester en service.

## Ce qui doit rester sur Vercel

Conserver côté Vercel ce qui doit vraiment être servi par l'application:

- le shell des pages et le rendu d'interface,
- les pages publiques cacheables ou ISR,
- les routes API nécessaires aux actions métier,
- les contrôles d'accès et de session,
- les crons et traitements planifiés qui doivent vivre dans l'environnement applicatif,
- les exports ou documents serveur quand ils sont un livrable métier,
- les protections globales qui doivent voir chaque requête.

À ne pas faire:
- déplacer une auth sensible dans le navigateur,
- transformer toutes les pages en API client,
- supprimer le cache alors qu'un ISR suffirait,
- multiplier les routes serveur pour des données déjà stables.

## Ce qui doit aller dans Supabase

Supabase doit absorber les charges data-centric:

- lectures bornées et paginées,
- agrégats et compteurs,
- vues ou RPC réutilisables pour les tableaux de bord,
- écritures métier persistantes,
- calculs qui servent plusieurs écrans plutôt qu'un seul composant,
- données qu'il est plus logique de requêter une fois puis de réutiliser.

Bonnes pratiques:
- sélectionner uniquement les colonnes utiles,
- préférer des bornes explicites,
- regrouper les lectures répétées,
- éviter de refaire le même calcul dans plusieurs routes Vercel.

À ne pas faire:
- mettre de la logique UI dans Supabase,
- déplacer les secrets applicatifs dans le SQL,
- contourner le serveur pour des données qui demandent un contrôle d'accès fin.

## Ce qui doit rester dans le navigateur

Le navigateur doit garder ce qui est local, temporaire ou purement interactif:

- filtres d'affichage,
- état d'ouverture de panneaux,
- brouillons non sensibles,
- préférences utilisateur non critiques,
- polling léger quand un cache n'apporte rien,
- enrichissements visuels qui ne changent pas la donnée métier.

Bonnes pratiques:
- réduire la cadence des pollings,
- couper les rafraîchissements quand l'onglet est caché,
- garder l'état local si aucune persistance n'est utile,
- dédupliquer les fetchs côté client si plusieurs composants lisent la même donnée.

À ne pas faire:
- stocker des secrets,
- déplacer dans le navigateur ce qui doit être contrôlé côté serveur,
- utiliser le client comme cache implicite de sécurité,
- faire reposer une fonctionnalité métier critique sur de l'état volatile uniquement local.

### Cas chat en mode "WhatsApp / Discord"

Pour un chat qui doit rester réactif sans exploser les quotas:

- garder le canal actif en priorité;
- utiliser Supabase Realtime comme voie principale quand elle est disponible;
- conserver un polling de secours plus lent;
- couper le polling quand l'onglet est caché ou hors ligne;
- revalider immédiatement au retour au premier plan ou à la reconnexion;
- ne pas relancer une revalidation à chaque micro-événement si un petit délai de regroupement suffit.

Ce compromis garde l'UX attendue d'une messagerie:

- les messages récents apparaissent vite dans la conversation active;
- les états secondaires restent un peu moins frais;
- le coût Vercel baisse sans casser l'usage principal;
- la logique métier reste dans Supabase et les mutations, pas dans une boucle de polling agressive.

À éviter pour le chat:

- polling global permanent sur tous les onglets;
- refresh fréquent même quand le panneau n'est pas visible;
- lecture répétée de plusieurs canaux en parallèle sans besoin métier;
- faux temps réel qui dépend uniquement d'un intervalle court côté client.

## Ce qu'il ne faut pas déplacer

Tout déplacer hors de Vercel est une erreur.

Certains coûts doivent rester côté serveur parce qu'ils sont la conséquence normale d'une fonctionnalité:

- auth et contrôle d'accès,
- admin et modération,
- génération de documents ou exports,
- routes qui servent une vérité métier unique,
- traitements planifiés,
- calculs qui doivent rester cohérents pour tous les utilisateurs.

La bonne question n'est pas "comment supprimer toute charge", mais:
- quelle charge est réellement nécessaire,
- où elle coûte le moins cher,
- et comment la borner.

## Exemples concrets dans CleanMyMap

### Déjà au bon endroit

La page d'accueil et la page méthodologie sont déjà au bon endroit: elles restent servies par Vercel avec régénération périodique plutôt que rendu dynamique permanent:

- [apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx)
- [apps/web/src/app/(app)/methodologie/page.tsx](../../apps/web/src/app/(app)/methodologie/page.tsx)

Le pattern retenu est de garder Vercel comme couche de présentation, tout en évitant de recalculer à chaque visite.

Les données de badges suivent aussi le bon modèle quand la route sert un payload court, privé et cacheable:

- [apps/web/src/app/api/gamification/badges/list/route.ts](../../apps/web/src/app/api/gamification/badges/list/route.ts)
- [apps/web/src/lib/gamification/badges/badge-list-client.ts](../../apps/web/src/lib/gamification/badges/badge-list-client.ts)

Le résultat est une donnée métier servie par Vercel, mais amortie pour éviter de multiplier les invocations.

Le badge d'exploration ne charge plus le payload complet des badges. Il lit directement le compteur utilisateur depuis Supabase côté navigateur:

- [apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx](../../apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx)

Le bon compromis ici est:
- Supabase pour le compteur partagé,
- navigateur pour la présentation et le calcul des paliers,
- pas d'API Vercel intermédiaire pour un simple nombre.

Les analytics de points ne recalculent plus le ledger dans la route Vercel. Le serveur appelle désormais un RPC Supabase et se contente de restituer le payload:

- [apps/web/src/app/api/gamification/analytics/points/route.ts](../../apps/web/src/app/api/gamification/analytics/points/route.ts)
- [apps/web/src/lib/gamification/points/analytics.ts](../../apps/web/src/lib/gamification/points/analytics.ts)

Le bon compromis ici est:
- Supabase pour l'agrégation;
- Vercel pour l'auth et la réponse HTTP;
- aucun parcours manuel du `points_ledger` dans la route.

Les notifications gardent aussi la bonne frontière: le navigateur gère le polling, mais avec une cadence réduite et une pause quand l'onglet est caché:

- [apps/web/src/components/navigation/notification-bell.tsx](../../apps/web/src/components/navigation/notification-bell.tsx)

Ici, déplacer l'état dans le navigateur est pertinent parce que la donnée est personnelle, temporaire et purement interactive.

Les stats GitHub de la page méthodologie sont récupérées avec une logique cacheable et parallélisée:

- [apps/web/src/lib/github/github-repository-stats.ts](../../apps/web/src/lib/github/github-repository-stats.ts)

Le principe est de ne pas recharger plusieurs fois les mêmes informations quand une seule lecture plus durable suffit.

Les images et médias déjà optimisés en amont restent aussi au bon endroit, avec la même logique de préparation en amont:

Le point de vigilance principal reste le suivant:

- `next/image` reste utile pour les images locales ou déjà préparées;
- pour les images distantes, les aperçus utilisateur et les médias déjà optimisés en amont, il vaut mieux éviter la transformation à la volée;
- si le média doit rester gratuit ou peu coûteux, compresser avant upload et préparer les tailles nécessaires à l'avance;
- ne pas compter sur le redimensionnement dynamique de Vercel ou de Supabase Storage pour un flux courant, surtout si le plan utilisé ne le garantit pas.

Exemples dans CleanMyMap:

- [apps/web/src/app/learn/ressources/learn-ressources-client.tsx](../../apps/web/src/app/learn/ressources/learn-ressources-client.tsx) affiche des références artistiques distantes en `unoptimized` pour éviter un resize serveur inutile.
- [apps/web/src/components/chat/ui/chat-message-item.tsx](../../apps/web/src/components/chat/ui/chat-message-item.tsx) rend les avatars et pièces jointes sans passer par un pipeline d'optimisation Vercel.

Règle pratique:
- si l'image est statique et locale, `next/image` reste acceptable;
- si l'image est distante, volumineuse, générée ou déjà précompressée, préférer `unoptimized` ou un flux d'assets préparé à l'avance;
- si l'image est un livrable réutilisable, la stocker avec ses variantes plutôt que demander une transformation serveur au moment de la lecture.

La carte dynamique est maintenant traitée sans proxy Vercel intermédiaire:

- [apps/web/src/lib/actions/http.ts](../../apps/web/src/lib/actions/http.ts)
- [apps/web/src/lib/actions/map-http.ts](../../apps/web/src/lib/actions/map-http.ts)
- [apps/web/src/lib/actions/map-http-utils.ts](../../apps/web/src/lib/actions/map-http-utils.ts)

Le bon emplacement est ici:

- le navigateur construit la demande;
- Supabase RPC filtre et renvoie les données utiles;
- le module client fusionne ensuite les sources et calcule l'affichage;
- `http.ts` ne garde plus que l'orchestration, tandis que les filtres et la normalisation vivent dans un module dédié pour rester lisibles et éviter les warnings de taille.

Le PDF du dossier élus ne repasse plus par une génération à la volée côté Vercel:

- [apps/web/src/app/api/reports/elus-dossier/route.ts](../../apps/web/src/app/api/reports/elus-dossier/route.ts)

Le bon compromis actuel est:
- réutiliser l'asset PDF cacheable lorsqu'il existe;
- renvoyer un refus explicite quand le document n'est pas déjà préparé;
- éviter une fonction longue qui reconstruit le PDF à chaque requête.

Les autres flux d'images et de PDF déclenchés par l'utilisateur peuvent rester à la demande quand ils ne servent qu'un export ponctuel:

- [apps/web/src/components/ui/pdf-export/use-pdf-export.ts](../../apps/web/src/components/ui/pdf-export/use-pdf-export.ts) garde le PDF côté navigateur avec un historique local;
- [apps/web/src/components/actions/map/actions-map-export-button.tsx](../../apps/web/src/components/actions/map/actions-map-export-button.tsx) déclenche des exports visuels à la demande, sans route serveur dédiée pour l'image;
- [apps/web/src/components/profil/impact-profile-page.tsx](../../apps/web/src/components/profil/impact-profile-page.tsx) produit une image de partage seulement quand l'utilisateur l'initie;
- [apps/web/src/components/reports/reports-web-document.tsx](../../apps/web/src/components/reports/reports-web-document.tsx) construit le document au moment où l'utilisateur lance l'aperçu ou l'export;
- [apps/web/src/components/actions/action-declaration/export-form-media.ts](../../apps/web/src/components/actions/action-declaration/export-form-media.ts) prépare des médias de sortie en réaction à une action explicite, pas en continu.

Règle d'audit:

- si le flux est purement user-triggered, local et réversible, il peut rester à la demande;
- si le flux devient récurrent, partagé, archivé ou consommé par plusieurs écrans, il doit être préparé, mis en cache ou déplacé vers Supabase Storage;
- si le flux mélange génération lourde et requête serveur répétée, il doit suivre une migration versionnée plutôt qu'un simple déplacement.

L'analytics et les pageviews sont aussi au bon endroit quand le consentement est bien appliqué avant le chargement:

- [apps/web/src/components/ui/conditional-analytics.tsx](../../apps/web/src/components/ui/conditional-analytics.tsx)
- [apps/web/src/components/analytics/project-pageview-tracker.tsx](../../apps/web/src/components/analytics/project-pageview-tracker.tsx)
- [apps/web/src/lib/analytics/funnel-client.ts](../../apps/web/src/lib/analytics/funnel-client.ts)

Le point clé est que les trackers ne doivent pas être importés ni déclenchés avant accord.

### À migrer proprement

Les cas ci-dessous ne doivent pas être corrigés par un simple déplacement opportuniste. Ils demandent une migration propre, versionnée et vérifiée:

- toute route Vercel qui ne fait que relayer une lecture Supabase fréquente sans contrôle d'accès, cache utile ou vraie transformation métier;
- tout calcul de compteurs, scores ou badges recopié dans plusieurs composants alors qu'il pourrait devenir un agrégat, une vue ou un RPC Supabase;
- tout polling utilisateur qui reste agressif alors qu'un déclenchement par visibilité, un délai de regroupement ou Supabase Realtime suffirait;
- toute transformation d'image ou de PDF réalisée à la volée alors que les variantes peuvent être préparées avant upload;
- toute logique de présentation ou d'interaction qui aurait glissé dans Supabase au lieu de rester dans le navigateur.
- les classements composites qui recalculent encore des scores à partir de listes brutes côté serveur au lieu d'utiliser des agrégats persistés ou un RPC dédié.
- les exports visuels et PDF déclenchés par un bouton utilisateur si le résultat est purement ponctuel et n'a pas vocation à être réutilisé.

Une migration propre, ici, veut dire:

- identifier la source de vérité;
- associer chaque changement à sa migration versionnée correspondante;
- déplacer la logique au bon niveau sans casser les permissions;
- ajuster les usages client et serveur qui consomment la donnée;
- vérifier le comportement sur les cas connecté, anonyme, propriétaire et non propriétaire;
- exécuter une vérification ciblée sur les fichiers ou routes effectivement touchés;
- valider que la charge Vercel baisse sans faire remonter un coût caché ailleurs.

Ce qui reste encore à exécuter, à ce stade, est surtout de finir la revue des autres flux qui pourraient encore recalculer côté Vercel:

- les compteurs, scores et badges qui n'auraient pas encore été consolidés dans un agrégat ou un RPC Supabase;
- le leaderboard gamification et les stats de progression qui recomposent encore des scores à partir de plusieurs lectures serveur, notamment autour de `progression_profiles`, `progression_events` et des agrégats d'impact;
- les flux d'images ou de PDF encore générés à la demande côté serveur alors qu'une préparation client ou un asset préparé suffirait;
- les routes Vercel restantes qui ne feraient que relayer une lecture Supabase sans valeur ajoutée métier.

Chaque cas restant doit suivre la même règle: migration versionnée, adaptation des usages, puis validation ciblée.

## Arbre de décision

Avant de déplacer une charge, poser ces questions:

1. Est-ce que la donnée doit être exacte à la milliseconde?
2. Est-ce que la donnée est personnelle ou partagée?
3. Est-ce que la donnée est déjà persistée dans Supabase?
4. Est-ce qu'un cache ou une ISR suffirait?
5. Est-ce que le navigateur peut garder l'état sans compromettre la cohérence?
6. Est-ce que le serveur doit garder un contrôle d'accès ou une vérité métier unique?

Si la réponse est:
- oui pour 1 ou 6, garder côté serveur,
- oui pour 2 ou 5, envisager le navigateur,
- oui pour 3 ou 4, privilégier Supabase ou le cache Vercel plutôt qu'une nouvelle API.

## Règle de revue

Une proposition de déplacement de charge doit préciser:
- ce qui bouge,
- d'où vers où,
- quel quota baisse,
- quel quota peut monter à la place,
- pourquoi ce compromis est acceptable.

## Checklist rapide

- la charge déplacée est-elle vraiment stable ou partageable?
- la donnée a-t-elle besoin d'être servie à chaque visite?
- la logique reste-t-elle au bon niveau de sécurité?
- le cache Vercel est-il déjà suffisant?
- le navigateur ne récupère-t-il pas une responsabilité métier?

## Commandes et lectures à relire

- [Gouvernance des quotas Vercel](./vercel-quota-governance.md)
- [Playbook anti-régression Vercel](./vercel-anti-regression-playbook.md)
- [Checklist Performance & Quotas Vercel](./performance-quotas-vercel-checklist.md)
- [Guide développeur Supabase](./supabase-quota-guide.md)
- [Découpage du bundle client et frontière serveur](./client-server-bundle-splitting.md)
- [Anti-patterns de build Vercel / Next.js](./vercel-next-build-anti-patterns.md)
