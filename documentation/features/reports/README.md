# Rapports d’impact — index documentaire

Cette arborescence distingue l’implémentation livrée, le Master Pack et les
objectifs encore planifiés. Les formules, KPI et données générées appartiennent
au runtime et à ses tests, pas à une copie documentaire.

## `CURRENT`

- [`master-pack.md`](./master-pack.md) — référence courante bornée aux
  chapitres et constantes vérifiés.
- Le modèle et le moteur sont dans `apps/web/src/lib/reports/report-model/`
  et `apps/web/src/lib/reports/master-pack/`.
- Depuis `/actions/history`, une action approuvée, publiée et terminée expose
  le CTA `Générer un rapport d’impact`. Il ouvre
  `/reports?tab=generation&actionId=<id canonique>` ; `/reports` résout alors
  l’action côté serveur et verrouille le périmètre mono-action avant génération.
- Le rapport mono-action réutilise le renderer PDF et l’historique existants.
  Le navigateur envoie seulement le type de périmètre, l’identifiant de
  l’action, le niveau de détail et les modules ; le payload final est celui
  résolu et renvoyé par le serveur. La consultation et le réexport historiques
  relisent le snapshot immuable sans recalcul.

## `PLAN`

- [`reports-parameters-and-objectives.md`](./reports-parameters-and-objectives.md)
  — spécification cible des paramètres de `/reports` et des objectifs dont
  l’implémentation doit encore être vérifiée ou complétée.

Le statut `PLAN` ne doit pas être interprété comme une description du rapport
effectivement généré. Pour les fiches de pages et le contexte produit, suivre
les documents canoniques de `documentation/pages_site/` et `documentation/product/`.
