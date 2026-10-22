# Pages Site

Point d'entrée du registre documentaire route-first.

## Racine de `pages_site/`

Les rôles principaux sont :

| Élément | État / rôle |
|---|---|
| `README.md` | `CURRENT` — conventions locales |
| `INDEX.md` | `CURRENT` — inventaire maître |
| `PAGE_FAMILIES.md` | `CURRENT` — contrat des familles de pages |
| `charte-pages-hors-blocs.md` | `AUDIT` — charte historique et propositions, sans autorité CURRENT |
| `PAGE_FAMILIES_PLAN.md` | `PLAN` — décisions encore ouvertes |
| `plan-correction-ui-contenu.md` | `PLAN` — travail UI/contenu résiduel |
| `visual_transformation_plan.md` | `PLAN` — backlog de transformations visuelles non exécuté |
| `AUDIT_BLOCS_RUBRIQUES.md` | `AUDIT` |
| `AUDIT_PAGES_SITE_CODE.md` | `AUDIT` |
| `rubriques_utilite_impact_.md` | `HISTORY` — photographie historique de l'organisation produit |
| `rubriques_cleanmymap.xlsx` | `HISTORY` — classeur historique, non source CURRENT |
| `generate-canonical-pages.mjs` | `TOOLING` — registre et audit non destructifs |
| `screen/` | `TOOLING` — scripts de capture ; les sorties sont des `SNAPSHOT` |
| `routes/` | `CURRENT` — documentation fonctionnelle canonique page par page |

Les audits, historiques, plans et outils peuvent rester à la racine tant que
leur statut est explicite. Le classeur Excel historique n'est pas une source
fonctionnelle et ne doit pas être modifié dans le cadre de cette clarification.
Les sorties de `screen/` relèvent du pipeline d'artefacts et ne constituent pas
une source fonctionnelle `CURRENT`. Il n'est pas nécessaire de créer une
hiérarchie supplémentaire uniquement pour les ranger.

## Documentation canonique — `routes/`

`documentation/pages_site/routes/` est la documentation fonctionnelle canonique
des pages, page par page. Chaque fiche `CURRENT` doit rester alignée sur le
comportement durable réellement livré.

Lorsqu'un lot modifie durablement une page, mettre à jour dans le même lot la
fiche concernée, et uniquement les fiches nécessaires. Cette maintenance
sémantique couvre notamment :

- objectif et parcours ;
- accès et AuthN/AuthZ visibles ;
- rôles et scopes visibles ;
- CTA ;
- contenu et données affichées ;
- états et erreurs ;
- fonctionnalités, relations entre pages et limites fonctionnelles.

La hiérarchie de vérité est :

```text
runtime réel
→ source canonique spécialisée du domaine
→ fiche fonctionnelle de page
→ capture ou snapshot
```

Une fiche décrit les conséquences fonctionnelles des contrats responsables et
référence leurs sources ; elle ne duplique pas le SQL/RLS, l'architecture
transverse ou la politique AuthZ globale.

La structure et les assets restent protégés. Sans instruction explicite pour
ce périmètre, il est interdit de renommer, déplacer, supprimer, fusionner,
réorganiser, normaliser massivement, nettoyer globalement ou réécrire les
fiches. Les captures et autres assets ne doivent pas être modifiés, remplacés
ou régénérés.

La maintenance fonctionnelle n'autorise aucune restructuration, suppression,
renommage, nettoyage global ou mutation automatique d'assets.

Les travaux de gouvernance documentaire peuvent donc maintenir les fiches
nécessaires sans ouvrir une restructuration de l'arborescence.

## Périmètre fonctionnel

`documentation/pages_site/` décrit les pages du point de vue utilisateur :

- rôle ;
- contenu ;
- parcours ;
- états ;
- UX/UI ;
- captures ;
- améliorations propres à la page.

Les sujets techniques transversaux restent dans leurs domaines :

```text
documentation/architecture/
documentation/database/
documentation/development/
documentation/design-system/
documentation/operations/
documentation/security/
```

Pour un sujet mixte :

```text
résumé fonctionnel ici
→ détail technique dans le domaine responsable
→ lien entre les deux
→ aucune duplication
```

## Une route, une fiche canonique

Principe :

```text
une route canonique
→ un dossier canonique
→ un nom stable
→ une documentation fonctionnelle unique
```

Les alias et redirections peuvent être inventoriés sans créer artificiellement
une nouvelle source fonctionnelle.

Cette règle décrit le modèle documentaire ; elle n'autorise pas une mutation
automatique de structure ou d'assets du sous-arbre `routes/`.

## Statuts des artefacts route-first

Le statut d'un artefact est déterminé par son rôle et son nom canonique :

| Artefact | Statut | Règle |
|---|---|---|
| `*-README.md` | `CURRENT` | source fonctionnelle canonique de la page |
| `*-presentation-detaillee.md` | `CURRENT / PLAN`, **optionnel** | le conserver seulement pour un complément fonctionnel précis, tenu à jour, distinct du README ; annoter toute cible non livrée `PLAN` |
| `*-liste-propositions-a-traiter.md` | `PLAN`, **optionnel** | conserver plusieurs propositions concrètes et non exécutées ; supprimer les listes vides ou les tâches génériques |
| `*-objectifs-non-pertinents.md` | `HISTORY`, **optionnel** | conserver les refus réellement décidés avec leur portée ou motif ; supprimer les trames « aucune idée écartée » |
| captures et screenshots | `SNAPSHOT` | photographie figée, jamais source de vérité |

Une présentation détaillée peut donc contenir des parties `CURRENT` et `PLAN`,
mais une fonctionnalité non implémentée ne doit jamais être présentée comme
`CURRENT` simplement parce qu'elle figure dans ce fichier. Un `SNAPSHOT` ne
prouve pas la conformité fonctionnelle et reste inférieur au runtime et aux
fiches `CURRENT`.

Le **seul fichier obligatoire d'une route canonique** est `nom-de-page-README.md`.
Les trois fichiers compagnons historiques ne sont ni obligatoires ni générés
à vide. Un dossier peut ne conserver aucun compagnon lorsque le README suffit.
Une présentation détaillée peut être pertinente pour des parcours riches :
elle doit alors documenter les états, interactions et limites réellement
livrés, avec les parties futures explicitement `PLAN`. Pour une information
isolée, compléter plutôt le README propriétaire.

La suppression ou consolidation d'un compagnon requiert une vérification de
sa connaissance distinctive et des liens consommateurs. Les captures et assets
restent protégés. Le contrôle strict conserve l'exigence du README canonique,
du registre de route et des liens Markdown effectivement publiés, sans imposer
un nombre artificiel de compagnons.

## Familles de pages

[`PAGE_FAMILIES.md`](./PAGE_FAMILIES.md) porte le contrat courant :

- sources de vérité runtime ;
- taxonomie ;
- routes structurantes ;
- exceptions ;
- invariants ;
- contrôles de dérive.

[`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md) contient uniquement le travail
encore ouvert. Il peut être supprimé lorsque ce travail est fermé.

Une fiche de route ne doit pas devenir une seconde source du mécanisme global de
résolution des familles.

## Propositions et idées écartées

Dans le modèle route-first, une liste `PLAN` ou une mémoire de rejet `HISTORY`
ne reste comme document séparé que lorsqu'elle contient plusieurs décisions
réelles et distinctes. Les idées vides, statuts « à compléter » et tâches
génériques relèvent du README ou sont supprimés. Un refus daté et motivé ne
doit pas disparaître au prétexte de réduire le nombre de fichiers.

## Captures

Les captures et screenshots ont le statut `SNAPSHOT`. Elles ne constituent
jamais une source supérieure au runtime ou à une fiche `CURRENT`.

Pour toute future capture, documenter lorsque l'information est disponible :

- route ou page ;
- viewport `desktop` ou `mobile` ;
- date ;
- SHA ou version de l'application, si disponible.

Une évolution fonctionnelle ne déclenche pas automatiquement une nouvelle
capture. Les snapshots existants sont conservés sans recompression ni
renommage cosmétique ; lorsqu'ils sont rattachés à une page, ils vivent dans
son dossier `screenshots/desktop/` ou `screenshots/mobile/`.

Les règles opérationnelles actuelles privilégient :

- WebP ;
- colocation avec la page canonique concernée ;
- nom explicite incluant page ou route ;
- desktop par défaut ;
- mobile uniquement lorsque demandé.

Les snapshots restent protégés : aucun nettoyage, remplacement, régénération ou
déplacement automatique n'est autorisé hors d'une migration explicitement
demandée.

## Générateur et contrôle de drift

`generate-canonical-pages.mjs` est non destructif. Il ne doit jamais écraser
automatiquement les fiches enrichies, les parties `PLAN` ou les snapshots ; ses
flags d'écriture sont refusés. Il sert à produire un rapport d'audit, pas à
réécrire `INDEX.md`, les fiches ou les captures.

`check-pages-site-route-drift.mjs` est un contrôle structurel. Son résultat
signifie :

```text
PASS = cohérence route ↔ INDEX ↔ fiche
```

Le contrôle strict vérifie aussi les liens Markdown relatifs des fiches
`*-README.md` et `*-presentation-detaillee.md` ; il ignore les URLs de
navigation, liens externes et ancres. Les contenus `PLAN`, `HISTORY` et
snapshots ne sont pas réécrits par ce garde-fou.

Un `PASS` ne prouve pas que le contenu d'une fiche est sémantiquement conforme
au runtime : cette vérification reste fonctionnelle et ciblée.

## Vérification UI

Lorsqu'une vérification visuelle est explicitement demandée :

1. capture desktop ;
2. export `.MD this page` ;
3. comparaison visuelle et sémantique ;
4. vérification des titres, CTA, statistiques, sources, états et accessibilité.

Une capture seule ne suffit pas.

## Maintenance de la racine

La maintenance structurelle autorisée par défaut peut :

- mettre à jour ce README ;
- maintenir `INDEX.md` lorsqu'une modification autorisée l'exige ;
- maintenir les contrats et plans racine ;
- clarifier le statut d'un audit ou d'un plan ;
- maintenir l'outil de contrôle documentaire.

Elle ne doit pas dériver en restructuration ou nettoyage global de `routes/`.

## Références

- [`INDEX.md`](./INDEX.md)
- [`PAGE_FAMILIES.md`](./PAGE_FAMILIES.md)
- [`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md)
- [`charte-pages-hors-blocs.md`](./charte-pages-hors-blocs.md)
