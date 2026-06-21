# Stratégie de répartition Vercel, Supabase et navigateur

Dernière mise à jour: 2026-06-12

Objectif: réduire fortement le risque Vercel sans tout déporter aveuglément.

La règle de base pour CleanMyMap est simple:
- Vercel sert l'interface et l'orchestration légère,
- Supabase gère les données et les agrégations persistantes,
- le navigateur garde l'état personnel, éphémère ou non critique.

Cette répartition limite les `Invocations`, les `Edge Requests` et le transfert origine, tout en gardant la logique métier au bon endroit.

## Tableau de placement rapide

| Fonction | À mettre où | Pourquoi |
| --- | --- | --- |
| Réponses fausses aux quiz | `localStorage` / `IndexedDB` | Pas besoin de Supabase ni de Vercel |
| Préférences d'affichage, calques carte, légendes ouvertes | navigateur | Évite des écritures inutiles |
| Brouillons de formulaire | navigateur | Évite l'auto-save serveur |
| Documents `.md` open source | repo Git / pages statiques | Pas besoin de base de données |
| Compteurs, scores, badges | RPC Supabase ou agrégats | Évite de calculer via Vercel |
| Images utilisateurs, rapports PDF générés | Supabase Storage | Évite Vercel Blob ou fonctions serveur |
| Carte dynamique | client → Supabase RPC filtré | Évite une API Vercel intermédiaire |
| Génération de PDF | navigateur si possible | Évite les fonctions Vercel longues |
| Analytics et pageviews | navigateur après consentement | Évite de charger PostHog ou les trackers avant accord |
| Cartes Leaflet lourdes | navigateur quand la zone devient visible | Évite de charger le chunk carto sur les vues où il n'est pas encore utile |

Notes d'application:
- si les réponses de quiz sont personnelles mais non sensibles, le navigateur reste le meilleur choix;
- si une carte a besoin d'une sécurité forte ou d'une logique métier complexe, garder le serveur Vercel entre le client et Supabase peut rester justifié;
- si un PDF doit être signé, archivé ou contrôlé, le navigateur n'est acceptable que si le flux reste simple et non critique.
- si l'analytics n'est pas consentie, ne pas charger le tracker ni le client PostHog;
- si une carte n'est pas encore dans la zone visible, ne pas déclencher son chunk Leaflet avant le scroll utile.

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

### Pages publiques cacheables

La page d'accueil et la page méthodologie ont été ramenées vers de l'ISR plutôt que du rendu dynamique permanent:

- [apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx)
- [apps/web/src/app/(app)/methodologie/page.tsx](../../apps/web/src/app/(app)/methodologie/page.tsx)

Le pattern retenu est de garder Vercel comme couche de présentation, tout en évitant de recalculer à chaque visite.

### Données de badges

La liste de badges passe par un cache court côté route puis un client léger:

- [apps/web/src/app/api/gamification/badges/list/route.ts](../../apps/web/src/app/api/gamification/badges/list/route.ts)
- [apps/web/src/lib/gamification/badges/badge-list-client.ts](../../apps/web/src/lib/gamification/badges/badge-list-client.ts)

Le résultat est une donnée métier servie par Vercel, mais amortie pour éviter de multiplier les invocations.

### Badges d'exploration

Le badge d'exploration ne charge plus le payload complet des badges. Il lit directement le compteur utilisateur depuis Supabase côté navigateur:

- [apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx](../../apps/web/src/components/gamification/ExplorerBadgeWrapper.tsx)

Le bon compromis ici est:
- Supabase pour le compteur partagé,
- navigateur pour la présentation et le calcul des paliers,
- pas d'API Vercel intermédiaire pour un simple nombre.

### Notifications

Le navigateur garde le polling, mais avec une cadence réduite et une pause quand l'onglet est caché:

- [apps/web/src/components/navigation/notification-bell.tsx](../../apps/web/src/components/navigation/notification-bell.tsx)

Ici, déplacer l'état dans le navigateur est pertinent parce que la donnée est personnelle, temporaire et purement interactive.

### Stats et agrégats

Les stats GitHub de la page méthodologie sont récupérées avec une logique cacheable et parallélisée:

- [apps/web/src/lib/github/github-repository-stats.ts](../../apps/web/src/lib/github/github-repository-stats.ts)

Le principe est de ne pas recharger plusieurs fois les mêmes informations quand une seule lecture plus durable suffit.

### Images et médias

Les images sont un point de vigilance particulier:

- `next/image` reste utile pour les images locales ou déjà préparées;
- pour les images distantes, les aperçus utilisateur et les médias déjà optimisés en amont, il vaut mieux éviter la transformation à la volée;
- si le média doit rester gratuit ou peu coûteux, compresser avant upload et préparer les tailles nécessaires à l’avance;
- ne pas compter sur le redimensionnement dynamique de Vercel ou de Supabase Storage pour un flux courant, surtout si le plan utilisé ne le garantit pas.

Exemples dans CleanMyMap:

- [apps/web/src/app/learn/ressources/learn-ressources-client.tsx](../../apps/web/src/app/learn/ressources/learn-ressources-client.tsx) affiche des références artistiques distantes en `unoptimized` pour éviter un resize serveur inutile.
- [apps/web/src/components/chat/ui/chat-message-item.tsx](../../apps/web/src/components/chat/ui/chat-message-item.tsx) rend les avatars et pièces jointes sans passer par un pipeline d’optimisation Vercel.

Règle pratique:
- si l’image est statique et locale, `next/image` reste acceptable;
- si l’image est distante, volumineuse, générée ou déjà précompressée, préférer `unoptimized` ou un flux d’assets préparé à l’avance;
- si l’image est un livrable réutilisable, la stocker avec ses variantes plutôt que demander une transformation serveur au moment de la lecture.

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
