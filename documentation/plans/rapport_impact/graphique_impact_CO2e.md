# Graphique d'impact CO2e de CleanMyMap

Ce document décrit le graphique temporel affiché dans l'estimateur d'impact environnemental de CleanMyMap.

## Objet du graphique

Le graphique montre l'évolution cumulée de l'impact environnemental proxy en équivalent CO2e du projet.
Il ne prétend pas fournir un bilan carbone certifié.
Il sert à rendre la contribution de chaque service, poste et journal projet visible, lisible et auditable.

## Règles de calcul

- L'abscisse représente le temps.
- Un point correspond à une semaine.
- L'ordonnée représente le CO2e proxy cumulé.
- La courbe est recalculée à partir des signaux réellement branchés sur CleanMyMap.
- Quand une donnée manque, elle est signalée comme non branchée plutôt que remplacée par zéro.
- Les bornes basses et hautes matérialisent l'incertitude des proxys.
- Le détail par point affiche la répartition en pourcentage des postes sur la semaine sélectionnée.
- Un deuxième ordre de lecture décompose le total en CO2 brut, électricité, autres GES, produits chimiques et eau.

## Composition du calcul

Le graphique agrège notamment:

- Vercel: pages vues, fonctions, déploiements, bande passante.
- Supabase: requêtes, auth, stockage, realtime, egress.
- Resend: emails et lots d'envoi.
- Codex: journal hebdomadaire propre à CleanMyMap.
- Clerk, PostHog, Sentry, Upstash, Pinecone, Stripe.
- Nom de domaine LWS.

## Règles d'interprétation

- Le total affiché est cumulatif.
- La part de chaque service doit être lue comme une contribution proxy, pas comme une mesure certifiée.
- Les services fixes, comme le nom de domaine, sont amortis sur la période.
- Les services variables doivent être reliés aux usages réels du projet lorsque c'est possible.
- Les données externes génériques ne doivent servir qu'en dernier recours.

## Auditabilité

Le graphique doit permettre de retrouver:

- la date du point sélectionné;
- le total hebdomadaire;
- la répartition par service;
- la décomposition de deuxième ordre;
- les hypothèses utilisées;
- les notes de données manquantes;
- les documents méthodologiques associés.

## Liens de lecture

- [ateliers_DU.md](../ateliers_DU.md)
- [journal_DU.md](../journal_DU.md)
- [journal_impact_DU.md](../journal_impact_DU.md)
