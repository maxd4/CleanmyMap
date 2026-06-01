# Cartes comparatives base + Terraink

## Objectif

Cette brique ajoute une comparaison volontaire entre deux lectures d'un même territoire :

- une carte de base, orientée repérage et lecture opérationnelle ;
- une carte Terraink, orientée poster, présentation et export visuel.

Le but n'est pas de remplacer les cartes métier existantes. Le but est de garder deux rendus côte à côte pour décider plus tard lequel sert le mieux chaque contexte.

## Principe d'usage

- Garder la carte de base comme référence terrain.
- Garder la version Terraink comme variante visuelle.
- Afficher les deux ensemble tant que la décision n'est pas tranchée.
- Éviter de supprimer la carte opérationnelle d'origine.

## Emplacements retenus

- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/components/reports/page-sections/reports-page-v1-layout.tsx`
- `apps/web/src/components/reports/page-sections/reports-page-v2-layout.tsx`
- `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx`
- `apps/web/src/components/sections/rubriques/sandbox-section.tsx`
- `apps/web/src/app/(app)/prints/report/page.tsx`

## Répartition par famille

- Accueil & Pilotage: `amber`
- Cartographie / bac à sable: `sky`
- Impact / rapports: `rose`

Une page garde une teinte dominante. La comparaison cartographique doit rester dans la famille de couleur de la page hôte.

## Contraintes techniques

- La carte de base utilise `react-leaflet` chargé dynamiquement avec `next/dynamic` et `ssr: false`.
- La carte Terraink est rendue comme une carte stylisée, sans remplacer les composants de production déjà présents.
- Les cartes métier existantes restent intactes.

## Critère de décision ultérieur

Quand il faudra choisir un seul rendu, comparer:

- la lisibilité à distance ;
- la qualité de lecture sur mobile ;
- la pertinence pour un rapport ou un export ;
- la compatibilité avec l'usage métier de la page.

