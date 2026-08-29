# Méthodologie de lecture des quotas

Cette fiche explique comment lire l'onglet `Quotas & plans` de CleanMyMap sans confondre services web, outils de développement et estimations partielles.

## Objectif

Le bloc quotas sert à afficher, service par service:

- le type de plan;
- les limites principales réellement connues;
- le quota le plus proche de la limite;
- les détails secondaires utiles;
- l'état `OK`, `attention`, `proche limite` ou `dépassé`;
- `NA` quand la donnée n'est pas fiable ou pas encore branchée.

## Règles de lecture

- un pourcentage global unique par service peut masquer un risque critique;
- la métrique principale doit toujours être la limite la plus proche du plafond;
- les autres quotas restent visibles en détail;
- les services de développement IA ne doivent pas être mélangés aux quotas web de production;
- les liens GitHub doivent pointer vers des sources réelles quand elles existent;
- les valeurs absentes doivent rester en `NA`.

## Sources utilisées

- GitHub pour les runs Actions, les alertes Dependabot et les warnings de code scanning;
- Supabase pour les limites et le cycle de facturation liés au projet;
- Resend pour les envois d'emails;
- LWS pour le domaine et les limites d'hébergement et de messagerie;
- Vercel et PostHog quand une limite pertinente est documentée;
- documentation du projet quand aucune API fiable n'est disponible.

## Comment lire la fiche

- la ligne principale indique le poste le plus sensible;
- les puces secondaires détaillent les autres quotas;
- la carte de synthèse indique les services suivis, les plans payants et les services proches d'une limite;
- un lien de documentation permet d'ouvrir cette fiche directement dans le site.

## Règle de transparence

Si la donnée n'est pas réellement disponible dans le repo ou chez le fournisseur, il faut afficher `NA`.

Le but n'est pas de produire un chiffre plausible, mais un chiffre défendable.
