# Pages Site

Point d'entrée du registre documentaire route-first.

## Racine de `pages_site/`

Les rôles principaux sont :

| Élément | État / rôle |
|---|---|
| `README.md` | `CURRENT` — conventions locales |
| `INDEX.md` | `CURRENT` — inventaire maître |
| `PAGE_FAMILIES.md` | `CURRENT` — contrat des familles de pages |
| `charte-pages-hors-blocs.md` | `CURRENT` — règles des pages hors blocs |
| `PAGE_FAMILIES_PLAN.md` | `PLAN` — décisions encore ouvertes |
| `plan-correction-ui-contenu.md` | `PLAN` — travail UI/contenu résiduel |
| `AUDIT_BLOCS_RUBRIQUES.md` | `AUDIT` |
| `AUDIT_PAGES_SITE_CODE.md` | `AUDIT` |
| `generate-canonical-pages.mjs` | outil de contrôle / génération documentaire |
| `routes/` | espace de travail route-first protégé |

Les audits et plans peuvent rester à la racine tant que leur statut est
explicite. Il n'est pas nécessaire de créer une hiérarchie supplémentaire
uniquement pour les ranger.

## Zone protégée — `routes/`

`documentation/pages_site/routes/` est un **espace de travail personnel**.

Par défaut :

- il peut être lu pour comprendre une page, une route ou une référence ;
- il ne doit pas être restructuré ;
- aucun fichier n'y est déplacé, supprimé, renommé ou réécrit ;
- aucun asset n'y est normalisé ou nettoyé.

Toute mutation sous `routes/` exige une demande explicite de l'utilisateur pour
ce périmètre.

Les travaux de gouvernance documentaire sur `pages_site/` concernent donc la
racine du dossier sauf instruction contraire.

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
automatique du sous-arbre `routes/`.

## Noyau documentaire historique des routes

Le modèle utilisé dans l'espace route-first repose principalement sur :

```text
nom-de-page-README.md
nom-de-page-presentation-detaillee.md
nom-de-page-liste-propositions-a-traiter.md
nom-de-page-objectifs-non-pertinents.md
```

Des fichiers complémentaires peuvent exister lorsqu'une page possède un besoin
réel : sources, protocole, étude, exception UI, backlog local ou document
partenaire.

Ne pas créer de fichier optionnel vide par anticipation.

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

Dans le modèle route-first :

- `liste-propositions-a-traiter` contient les propositions retenues mais non
  exécutées ;
- `objectifs-non-pertinents` conserve brièvement les idées explicitement
  écartées et leur raison.

Ces conventions n'imposent aucune réorganisation automatique des fichiers déjà
présents sous `routes/`.

## Captures

Les règles actuelles privilégient :

- WebP ;
- centralisation par bloc ou famille lorsque le travail concerné le prévoit ;
- nom explicite incluant page ou route ;
- desktop par défaut ;
- mobile uniquement lorsque demandé.

Les captures déjà présentes sous `routes/` appartiennent à la zone protégée :
aucun nettoyage ou déplacement automatique.

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

Elle ne doit pas dériver en nettoyage de `routes/`.

## Références

- [`INDEX.md`](./INDEX.md)
- [`PAGE_FAMILIES.md`](./PAGE_FAMILIES.md)
- [`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md)
- [`charte-pages-hors-blocs.md`](./charte-pages-hors-blocs.md)
