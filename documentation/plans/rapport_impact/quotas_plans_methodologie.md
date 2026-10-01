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

## Policies de risque et de stockage

Les calculs dérivés gardent un owner explicite dans le code et une version de
policy. Les valeurs ci-dessous sont les valeurs `CURRENT`; elles ne doivent
pas être recalibrées sans décision métier ou scientifique documentée.

| Domaine | Owner | Version | Valeurs et unités | Statut |
| --- | --- | --- | --- | --- |
| Score de risque service | `service-risk-policy.ts` | `service-risk-v1` | poids 0,24 / 0,22 / 0,16 / 0,18 / 0,20 ; bandes 30 / 60 / 80 points | `POLICY`, score `DERIVED` |
| Alertes risque service | `service-risk-policy.ts` | `service-risk-v1` | part 70 %, croissance 15 %, pente 10 % | `POLICY` |
| Contribution stockage métier | `storage-business-contribution-policy.ts` | `storage-business-contribution-v1` | parts 25/40 %, croissance 35/75 %, accélération 3/6 MiB, export 4 MiB, pression plafonnée 14/56/18/12/8 points | `POLICY` |

Une mesure manquante n'est pas un zéro : elle reste `NA`/`NULL`, n'alimente
pas une croissance ou une alerte de croissance. Le score service peut rester
un `DERIVED` partiel lorsque seule la base historique manque : la composante
historique est alors neutre dans la somme pondérée, sans devenir une mesure
observée, et `scoreCoverage` le signale. Sa couverture connue est conservée
lorsque la vue agrège des objets. Un zéro n'est conservé que lorsque
la source canonique a effectivement observé zéro ou qu'une agrégation complète
établit l'élément neutre.

Les champs `YYYY-MM-DD` sont des dates civiles sans instant. Lorsqu'une API
existante exige un `Date`, l'adaptateur partagé
`apps/web/src/lib/time/civil-date.ts` les représente à minuit UTC et les
formateurs indiquent explicitement `UTC`; les contrats d'action qui comparent
un instant local continuent d'utiliser `Europe/Paris` via leur primitive
Actions dédiée.
