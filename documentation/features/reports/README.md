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
  résolu et renvoyé par le serveur. Les nouvelles générations portent
  `snapshotSchemaVersion: 2` et un `snapshotMetadata` complet : identifiant de
  génération, éventuelle lignée `sourceGenerationId`, template, renderer HTML
  officiel, `filtersVersion`, `generatedAt`, période et timezone UTC, scope,
  niveau, modules, provenance, versions proxy/règles qualité et disponibilité
  des sources. Les snapshots historiques sans version ou en v1 restent
  compatibles à la lecture ; ils ne sont pas silencieusement mis à niveau.
  La consultation et le réexport historiques relisent le snapshot immuable
  sans recalcul ni quota. « Créer une nouvelle version » est une opération
  distincte : elle est autorisée seulement pour un snapshot complet compatible,
  consomme le quota existant et crée une nouvelle ligne liée à sa source.

- Depuis `Mes fichiers`, « Reprendre la configuration » charge la ligne
  historique owner-scoped côté serveur et préremplit le générateur existant
  avec les paramètres réellement conservés. Les bornes absolues d'une période
  relative sont affichées comme dates d'origine, mais une nouvelle génération
  relative utilise la période courante ; une période personnalisée conserve ses
  deux bornes. Les champs inconnus des snapshots legacy, v1 ou v2 incomplets
  restent signalés et ne sont jamais inventés. Une nouvelle génération repasse
  par les validations, les sources canoniques et le quota normal, et crée un
  snapshot indépendant sans modifier l'original.

- La reproductibilité livrée est sémantique : les mêmes données, libellés,
  unités, limites et date de génération sont relus depuis le snapshot. Le PDF
  binaire n’est pas conservé ; une identité octet pour octet n’est donc pas
  garantie lorsque le renderer ou l’environnement évolue.
- Les thèmes PDF `Impact` et `Scientifique` sont CURRENT dans le générateur :
  le sélecteur ne modifie que le CSS du renderer HTML officiel. La composition,
  les données, les KPI, les modules et les niveaux de détail restent identiques.
  Le thème n'est ni un paramètre de génération ni une propriété du snapshot ;
  les snapshots historiques sans thème explicite restent donc compatibles et
  sont rendus avec le thème choisi, Impact par défaut. Changer de thème lors de
  la consultation ou du réexport ne refait pas la génération et ne consomme
  pas de quota.
- Le renderer historique vérifie la paire de versions enregistrée. Une paire
  incompatible est refusée explicitement ; le système ne promet pas une
  identité binaire entre deux versions de renderer et ne stocke pas de PDF
  binaire comme substitut du snapshot.
- [`report-pdf-themes-and-reuse.md`](./report-pdf-themes-and-reuse.md) — contrat
  CURRENT des deux habillages et de leur réutilisation sur les snapshots ; les
  capacités de citabilité, Tagged PDF et export machine restent PLAN.

## `PLAN`

- [`reports-generation-parameters.md`](./reports-generation-parameters.md)
  — contrat CURRENT des paramètres et filtres effectivement acceptés par le
  générateur multi-actions ; les extensions avancées restent planifiées.
- [`impact-goals-and-progression.md`](./impact-goals-and-progression.md)
  — futurs objectifs configurables, distincts du moteur de génération.

## `COMPATIBILITY`

- [`reports-parameters-and-objectives.md`](./reports-parameters-and-objectives.md)
  — ancienne façade documentaire conservée pour compatibilité, sans seconde
  source de vérité ; les paramètres actuels sont décrits dans
  `reports-generation-parameters.md` et les objectifs dans leur fiche PLAN.

Le statut `PLAN` ne doit pas être interprété comme une description du rapport
effectivement généré. Pour les fiches de pages et le contexte produit, suivre
les documents canoniques de `documentation/pages_site/` et `documentation/product/`.
