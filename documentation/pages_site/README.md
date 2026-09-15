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
| `routes/` | `CURRENT` — documentation fonctionnelle canonique page par page |

Les audits et plans peuvent rester à la racine tant que leur statut est
explicite. Il n'est pas nécessaire de créer une hiérarchie supplémentaire
uniquement pour les ranger.

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

Les captures déjà présentes sous `routes/` restent protégées : aucun nettoyage,
remplacement, régénération ou déplacement automatique.

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
