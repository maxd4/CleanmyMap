# Rapports d’impact : index documentaire

Ce dossier sépare les contrats observables (`CURRENT`), les évolutions encore proposées (`PLAN`) et les liens historiques (`COMPATIBILITY`). Le runtime et ses tests priment sur toute formulation documentaire.

## `CURRENT`

- [master-pack.md](./master-pack.md) : **repère de chapitres du Master Pack**, borné aux constantes et à leurs consommateurs vérifiés. Il n'est pas la preuve que le PDF produit par `/reports` contient exactement ces chapitres.
- [Fiche canonique `/reports`](../../pages_site/routes/03-cartographie-impact/reports/reports-README.md) : accès, onglets, modules réellement exposés, quota, historique et états.
- **Modèle et calculs :** `apps/web/src/lib/reports/report-model/` et `apps/web/src/lib/reports/master-pack/`, selon les consommateurs réels.
- **Génération et historique `/reports` :** `apps/web/src/components/reports/reports-web-document.tsx`, `apps/web/src/lib/pdf-export/`, `apps/web/src/app/api/reports/generations/` et tests associés. Les frontières client/serveur comptent pour la confiance accordée aux résultats.

## `PLAN`

- [reports-generation-parameters.md](./reports-generation-parameters.md) : paramètres de filtrage des rapports, inventaire des sources et séquencement du P0 vers les rapports multi-actions.
- [impact-goals-and-progression.md](./impact-goals-and-progression.md) : **autre responsabilité métier**, objectifs persistants, progression collective et surface UX restant à arbitrer.
- [Propositions propres à `/reports`](../../pages_site/routes/03-cartographie-impact/reports/reports-liste-propositions-a-traiter.md) : périmètre `single_action`, futur versionnement et générations dérivées.
- [Roadmap priorisée](../../product/roadmap-priorisee.md) : ordre et conditions de clôture des chantiers.

## `COMPATIBILITY`

- [reports-parameters-and-objectives.md](./reports-parameters-and-objectives.md) : ancien chemin maintenu comme redirection, sans seconde source de vérité.

## Frontières non négociables

- Une fonction présente dans le code ne suffit pas à prouver qu'elle est appelée par la page `/reports`.
- Le snapshot de données historiques et l'identité binaire du PDF sont deux garanties différentes.
- Le futur scope `single_action` exige une résolution canonique côté serveur ; les chiffres fournis par le client ne prouvent pas une action réelle.
- Ni les cibles d'objectifs, ni les campagnes ni les nouvelles migrations proposées ne sont requises pour le premier rapport mono-action.
