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

## CO₂e électrique: mesure, calcul et équivalent proxy

Le moteur distingue explicitement trois états:

- `kWh × facteur électrique`: utilisé uniquement lorsqu'un signal de consommation électrique réel est fourni. Le CO₂e est alors calculé dans ce sens et ne doit pas être ajouté une seconde fois à un proxy déjà inclus dans le même total;
- `équivalent électrique estimé`: affiché lorsque le moteur répartit un CO₂e proxy entre des familles, sans disposer de kWh. Cette valeur ne signifie pas qu'une consommation électrique a été mesurée;
- `à compléter`: affiché lorsqu'aucun signal électrique ni proxy exploitable n'est disponible.

Le facteur par défaut du moteur est centralisé à `0,35 kgCO₂e/kWh` pour des serveurs majoritairement américains. Il s'agit d'un ancrage configurable, à remplacer par un facteur eGRID régional ou une localisation électrique réelle du fournisseur dès que cette donnée est connue. Les références de cadrage sont [EPA eGRID](https://www.epa.gov/egrid), [EPA - déterminer les émissions liées à l'électricité](https://www.epa.gov/system/files/documents/2025-01/using-egrid-to-determine-emissions.pdf) et [EIA - facteurs d'émissions de l'électricité](https://www.eia.gov/tools/faqs/faq.php?id=76&t=3).

Les data centers ne reçoivent pas une part de refroidissement universelle: l'IEA indique des situations pouvant aller d'environ 7 % dans certains hyperscalers efficaces à plus de 30 % dans des installations moins efficaces. Les serveurs accélérés, principalement associés à l'adoption de l'IA, sont un moteur important de la croissance prévue de la consommation des data centers; aucune part du trafic ou de l'impact de CleanMyMap n'est attribuée à l'IA sans signal spécifique. Voir [IEA, Energy and AI](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai).

Le repère d'interface `10 kgCO₂e ≈ 70 km en voiture thermique moyenne` est une comparaison pédagogique indépendante du calcul CleanMyMap. Il est dérivé de l'ordre de grandeur `1,42 kgCO₂e/100 km` de [Impact CO₂ / Base Empreinte ADEME](https://impactco2.fr/outils/transport/itineraire?iframe=1), et ne transforme pas un proxy numérique en distance réellement parcourue.
