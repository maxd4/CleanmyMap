# Méthodologie ACV numérique de CleanMyMap

Ce document explique comment CleanMyMap lit, trace et documente l'impact carbone de son propre site.

Le principe est simple: chaque chiffre affiché dans l'onglet `Impact carbone` doit pouvoir être relié à une source réelle, à une période claire et à un niveau de confiance explicite. Quand une donnée n'est pas branchée, la bonne réponse est `NA`, pas une estimation déguisée.

## Ce que mesure l'onglet

- l'impact carbone du site lui-même, côté production;
- l'impact historique enregistré mois par mois;
- l'impact de développement lié à l'usage des outils IA;
- les contributions relatives des services d'infrastructure et d'outillage;
- les données disponibles et les zones encore en `NA`.

## Sources utilisées

L'onglet impact s'appuie sur un mélange de sources réelles et de proxys clairement étiquetés:

- Supabase pour les snapshots mensuels et les signaux applicatifs;
- GitHub pour les runs GitHub Actions quand la source est disponible;
- Vercel pour les déploiements et les coûts de rendu si la métrique existe;
- Resend pour les envois d'emails;
- PostHog pour la télémétrie et le volume d'événements;
- les outils d'IA de développement, comptés à part dans l'ACV de développement;
- des proxys de calcul uniquement quand aucune métrique directe n'est accessible.

## Règle de lecture

- `observé` signifie qu'un chiffre vient d'une vraie source branchée;
- `dérivé` signifie qu'un calcul a été fait à partir de signaux observés;
- `proxy` signifie qu'une estimation est utilisée faute de mieux;
- `NA` signifie que le projet ne dispose pas encore d'une donnée exploitable.

## Comment lire la courbe

- la courbe pleine suit l'historique des snapshots mensuels du site;
- la courbe en pointillé distingue l'impact du développement assisté par IA;
- les valeurs mensuelles doivent rester cohérentes avec la période de capture;
- si le mois courant n'est pas complet, la projection doit être affichée comme telle.

## Distinguer production et développement

CleanMyMap sépare volontairement:

- les services web de production, qui appartiennent au site lui-même;
- les outils d'IA de développement, qui appartiennent à l'ACV de fabrication du site.

Les modèles utilisés pour coder ne doivent donc pas apparaître dans les quotas web. Ils doivent apparaître dans l'ACV de développement avec un badge clair indiquant qu'ils sont hors production.

## Règle de transparence

Le bloc impact doit toujours indiquer:

- la période couverte;
- la source de la donnée;
- le statut `observé`, `dérivé`, `proxy` ou `NA`;
- la cohérence avec les autres vues du projet.

Si une métrique n'est pas assez fiable pour être publiée, elle doit rester en `NA`.
