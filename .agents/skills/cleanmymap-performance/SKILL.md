---
name: cleanmymap-performance
description: "Optimiser une lenteur démontrée, Core Web Vitals, bundles, rendu, cache, images, appels et polling CleanMyMap avec mesures avant-après."
category: repository
risk: medium
source: local
tags: "[performance]"
---

# Performance mesurable du web et du mobile

## Déclenchement

Activer pour lenteur observée, poids JS, bundle, coût de rendu, requêtes répétées, données volumineuses, images, cartographie, cache, temps de réponse ou Core Web Vitals.

## Sources

`documentation/operations/platform-cost-governance.md`, `documentation/architecture/frontend-backend-boundaries.md`, `apps/web/AGENTS.md`, et `apps/mobile/AGENTS.md` si mobile. Les références `references/` de ce skill servent de pistes historiques, jamais de contrat supérieur au runtime.

## Procédure

1. Formuler symptôme, parcours, métrique, appareil, connexion et **baseline comparable**. Sans baseline, annoncer une hypothèse de gain non prouvée.
2. Identifier la cause : requêtes, SQL/index, rendu serveur, hydratation, render React, bundle, images, service tiers ou polling. Mesurer la frontière responsable avant optimisation.
3. Classer chaque opération distante `A essentielle`, `B facultative`, `C récurrente` selon le document de coût. Différer l'exécution réseau des enrichissements B, pas seulement leur affichage.
4. Préférer projections courtes, calcul en owner canonique, cache compatible avec permissions/fraîcheur, déduplication et arrêt du polling inactif ; ne jamais ajouter un cache sans invalidation.
5. Ne pas sacrifier accessibilité, sécurité, données essentielles ni qualité du contenu pour obtenir un benchmark artificiel.

## Preuve

Comparer avant/après avec protocole identique, métriques chiffrées et provenance. Tester chargement froid/chaud, états vides, erreurs, changement d'utilisateur/paramètres et invalidation. Distinguer profil local, mesure de build et trafic réel observé. Ne déclarer aucun gain sans résultat exécuté.
