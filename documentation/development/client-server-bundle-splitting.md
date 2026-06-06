# Découpage du bundle client et frontière serveur

Dernière mise à jour: 2026-06-06

Ce guide capture les erreurs qui ont gonflé les routes `learn` et `missions` afin d’éviter de les répéter.

## Objectif

Réduire le JavaScript initial sans changer le comportement fonctionnel:
- garder les pages declaratives quand c'est possible,
- sortir les widgets lourds du chemin critique,
- éviter de transformer un serveur component en page client complète par accident,
- garder les composants interactifs isolés dans de petits îlots client.

## Règles à retenir

- Une page App Router n'a pas besoin de `"use client"` si son rendu principal est déclaratif.
- Si une page a besoin de la langue, lire la locale côté serveur avec `getServerLocale()` au lieu de remonter un hook client.
- Si une page doit tracer une visite ou déclencher un effet léger, extraire un composant client minuscule dédié à cet effet.
- Les composants purement visuels qui ne lisent que leurs `props`, `Link` et des icônes peuvent rester côté serveur.
- Les composants interactifs lourds doivent rester explicitement client et, si possible, être chargés via `next/dynamic` dans un wrapper client.
- `ssr: false` doit vivre dans un composant client wrapper, pas directement dans une page serveur.

## Anti-patterns évités ici

- `page.tsx` marqué `"use client"` alors qu'il ne fait que composer du JSX et lire une locale.
- `useSitePreferences()` utilisé dans une page entière pour un simple choix `fr/en`.
- `recordLearnPageVisit()` appelé dans la page complète au lieu d’un tracker client indépendant.
- composants de présentation gardés en client alors qu’ils n’avaient ni état ni effets.
- gros widgets importés statiquement dans la page alors qu’ils ne sont visibles qu’après le premier écran.
- `next/dynamic(..., { ssr: false })` déclaré dans un serveur component.

## Pattern recommandé

### Pages

- Garder la page en serveur si elle:
  - assemble du contenu,
  - lit la locale ou les données serveur,
  - n'a pas d'état UI local complexe.

- Transformer la page en client seulement si:
  - elle dépend de plusieurs hooks UI,
  - elle pilote un comportement local complexe,
  - la logique d’interaction ne peut pas être extraite proprement.

### Widgets lourds

- Déporter en `dynamic`:
  - cartes Leaflet,
  - quiz interactifs,
  - panneaux à état local et calculs répétés,
  - blocs de contenu très lourds qui ne sont pas nécessaires au premier écran.

- Garder en statique:
  - en-têtes de page,
  - blocs explicatifs,
  - cartes de navigation,
  - panneaux d'introduction sans état.

## Exemple concret

Dans cette base:
- [`apps/web/src/app/learn/comprendre/page.tsx`](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/learn/comprendre/page.tsx)
- [`apps/web/src/app/learn/sentrainer/page.tsx`](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/learn/sentrainer/page.tsx)
- [`apps/web/src/app/(app)/missions/[id]/page.tsx`](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/(app)/missions/[id]/page.tsx)

les gros widgets sont maintenant chargés par wrappers dédiés, ce qui garde le shell initial plus léger.

## Checklist avant de toucher une page lourde

- Est-ce que la page a vraiment besoin d’être client ?
- Est-ce que la locale peut venir du serveur ?
- Est-ce que le tracking peut vivre dans un micro-composant client ?
- Est-ce que les sous-blocs lourds peuvent être différés ?
- Est-ce que le `ssr: false` est encapsulé dans un wrapper client ?
- Est-ce que les composants visuels simples restent server-compatible ?

## Validation conseillée

- `npx next build`
- vérifier que la route concernée n’embarque plus un gros chunk unique
- mesurer à nouveau le manifest de route après le split

