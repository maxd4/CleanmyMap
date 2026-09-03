# Découpage du bundle client et frontière serveur

Guide de développement pour préserver une frontière Server/Client explicite dans
l'application web et limiter le JavaScript initial sans changer les contrats
fonctionnels.

La vue architecturale générale reste définie dans
[`../architecture/frontend-backend-boundaries.md`](../architecture/frontend-backend-boundaries.md).

## Principes

Avec l'App Router :

- garder une page ou un composant côté serveur lorsqu'il compose principalement
  du contenu, lit des données serveur ou ne nécessite pas d'état navigateur ;
- isoler l'interactivité dans le plus petit sous-arbre client cohérent ;
- ne pas ajouter `"use client"` à une arborescence entière uniquement pour
  simplifier un import ;
- ne pas déplacer un secret, une AuthZ ou un accès privilégié côté client pour
  réduire une frontière de composants.

## Locale et effets navigateur

Une page déclarative n'a pas besoin de devenir client pour lire la locale si le
mécanisme serveur existant couvre le besoin.

Lorsqu'un comportement dépend uniquement d'un effet navigateur léger, par
exemple un tracking ou une synchronisation locale, préférer un micro-composant
client dédié plutôt que convertir toute la page.

Toujours réutiliser le mécanisme de locale et de préférences déjà canonique dans
la zone concernée.

## Widgets lourds

Différer les composants lourds lorsqu'ils ne sont pas nécessaires au premier
écran et que le chargement différé ne dégrade pas le contrat utilisateur.

Candidats typiques :

- cartes Leaflet ou autres moteurs cartographiques ;
- quiz fortement interactifs ;
- éditeurs ou panneaux complexes à état local ;
- visualisations lourdes ;
- fonctionnalités rarement ouvertes sur la route.

Conserver en chargement normal les éléments structurants et légers :

- en-têtes ;
- navigation ;
- contenu explicatif ;
- cartes de navigation simples ;
- panneaux de présentation sans état complexe.

## `next/dynamic` et SSR

Lorsqu'un composant dépend strictement du navigateur, l'isoler derrière une
frontière client adaptée.

`ssr: false` doit être utilisé dans un contexte client compatible avec Next.js ;
ne pas transformer artificiellement une page serveur complète pour rendre
possible un import dynamique.

Avant d'introduire `ssr: false`, vérifier si le problème vient réellement d'une
API navigateur ou d'une dépendance non compatible SSR.

## Données entre Server et Client Components

Les props qui traversent la frontière doivent rester sérialisables et adaptées
au contrat d'affichage.

Préférer :

- primitives ;
- objets de données normalisés ;
- identifiants ;
- structures explicites et sérialisables.

Éviter de transmettre arbitrairement :

- fonctions serveur ;
- objets non sérialisables ;
- clients SDK ;
- objets transportant un secret ou une capacité privilégiée.

Reconstruire côté client uniquement ce qui relève réellement de l'interaction
navigateur.

## Fetch et hydratation

Éviter :

- plusieurs fetchs clients indépendants vers la même donnée ;
- un gros objet hydraté alors que l'UI n'utilise qu'un sous-ensemble ;
- un chargement client d'une donnée déjà disponible lors du rendu serveur ;
- une page entière rendue dynamique pour un état local mineur.

Pour le placement Vercel/Supabase et les coûts de plateforme, voir
[`../operations/platform-cost-governance.md`](../operations/platform-cost-governance.md).

## Cartographie

Les dépendances cartographiques lourdes doivent rester confinées aux surfaces
qui les utilisent.

Ne pas importer le moteur cartographique dans un shell global. La stratégie de
chargement doit rester compatible avec le SSR de la route et avec la
progressivité de l'interface.

## Méthode avant modification

Pour une page ou un composant lourd :

1. identifier ce qui exige réellement le client ;
2. séparer rendu déclaratif, données serveur et interaction navigateur ;
3. vérifier si un effet peut être isolé ;
4. vérifier si un widget peut être différé ;
5. préserver les props et contrats publics ;
6. mesurer à nouveau le bundle ou le signal qui a motivé le changement.

Ne pas faire un split uniquement pour atteindre une taille arbitraire.

## Validation

Selon le changement :

```bash
npm run typecheck -w apps/web
npm run lint -w apps/web
npm run test:regression-gates -w apps/web
```

Pour un changement destiné à réduire le bundle ou le coût d'une route, utiliser
également le build ou l'audit courant qui mesure réellement cette surface.

Ne pas documenter une amélioration de bundle sur la seule base d'une extraction
de fichier : vérifier le résultat produit.
